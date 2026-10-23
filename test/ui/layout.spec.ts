import { expect, test } from "@playwright/test";
import { _electron as electron, ElectronApplication, Page } from "playwright";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";

const password = "ui-test-password";
let app: ElectronApplication;
let page: Page;
let userDataDirectory: string;

test.beforeAll(async (): Promise<void> => {
	userDataDirectory = await mkdtemp(path.join(os.tmpdir(), "mini-diary-ui-"));
	app = await electron.launch({
		args: ["."],
		env: {
			...process.env,
			ELECTRON_USER_DATA_DIR: userDataDirectory,
			LANG: "en_US.UTF-8",
			MINI_DIARY_TEST_LOCALE: "zh-CN",
			TZ: "UTC",
		},
	});
	page = await app.firstWindow();
	page.on("pageerror", (error) => console.error(error));
	const passwords = page.locator('input[type="password"]');
	await passwords.nth(0).fill(password);
	await passwords.nth(1).fill(password);
	await page.locator(".password-creation-form button").click();
	await expect(page.locator(".app-titlebar")).toBeVisible();
});

test.afterAll(async (): Promise<void> => {
	if (app) {
		const child = app.process();
		child?.kill("SIGKILL");
		await new Promise<void>((resolve) => {
			if (!child || child.exitCode !== null || child.signalCode !== null) resolve();
			else child.once("exit", () => resolve());
		});
	}
	if (userDataDirectory) await rm(userDataDirectory, { force: true, recursive: true });
});

async function box(
	selector: string,
): Promise<{ height: number; width: number; x: number; y: number }> {
	const value = await page.locator(selector).boundingBox();
	if (!value) throw Error(`Element not found: ${selector}`);
	return value;
}

test("keeps header and search icons fully visible", async (): Promise<void> => {
	const searchWrapper = await box(".search-input-wrapper");
	const searchIcon = await box(".search-input-icon");
	const sidebar = await box(".sidebar");
	const settingsButton = await box(".app-icon-button");
	const settingsIcon = await box(".app-icon-button svg");

	expect(searchIcon.x).toBeGreaterThanOrEqual(searchWrapper.x);
	expect(searchIcon.y).toBeGreaterThanOrEqual(searchWrapper.y);
	expect(searchIcon.x + searchIcon.width).toBeLessThanOrEqual(
		searchWrapper.x + searchWrapper.width,
	);
	expect(searchIcon.y + searchIcon.height).toBeLessThanOrEqual(
		searchWrapper.y + searchWrapper.height,
	);
	expect(searchWrapper.width).toBe(sidebar.width - 41);
	await expect(page.locator(".calendar-today-button")).toBeVisible();
	expect(settingsIcon.x).toBeGreaterThanOrEqual(settingsButton.x);
	expect(settingsIcon.y).toBeGreaterThanOrEqual(settingsButton.y);
	expect(settingsIcon.x + settingsIcon.width).toBeLessThanOrEqual(
		settingsButton.x + settingsButton.width,
	);
	expect(settingsIcon.y + settingsIcon.height).toBeLessThanOrEqual(
		settingsButton.y + settingsButton.height,
	);
	await expect(page.locator(".search-input-wrapper")).toHaveScreenshot("search-input.png");
	await expect(page.locator(".app-icon-button")).toHaveScreenshot("settings-button.png", {
		maxDiffPixels: 160,
	});
});

test("keeps the today action available for returning to today", async (): Promise<void> => {
	await page.locator(".calendar-nav-row > button").first().click();
	const todayButton = page.locator(".calendar-today-button");
	await expect(todayButton).toBeVisible();
	await expect(todayButton).toHaveText(/今天|Today/);
	await todayButton.click();
	await expect(todayButton).toBeVisible();
});

test("preserves the paper sidebar and floating editor geometry", async (): Promise<void> => {
	const sidebar = await box(".sidebar");
	const editor = await box(".editor");
	const search = await box(".search-input-wrapper");
	const calendar = await box(".DayPicker");
	const title = await box(".editor-title-wrapper");
	const content = await box(".lexical-content-editable");
	const toolbar = await box(".editor-toolbar");
	const day = await box(".DayPicker-Day--selected .DayPicker-DayButton");
	const weekdayHeaders = await page
		.locator(".DayPicker-Weekday")
		.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().x));
	const firstWeekDays = await page
		.locator(".DayPicker-Week")
		.first()
		.locator(".DayPicker-Day")
		.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().x));
	const titleStyles = await page.locator(".editor-title-input").evaluate((element) => {
		const style = getComputedStyle(element);
		return {
			background: style.backgroundColor,
			border: style.borderStyle,
			shadow: style.boxShadow,
		};
	});

	expect(sidebar.width).toBe(264);
	expect(editor.x).toBe(sidebar.x + sidebar.width);
	expect(search.height).toBe(44);
	expect(calendar.width).toBeLessThanOrEqual(sidebar.width - 40);
	expect(title.width).toBe(content.width);
	expect(content.y).toBeGreaterThan(title.y + title.height);
	expect(toolbar.height).toBe(58);
	expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(editor.y + editor.height - 20);
	expect(toolbar.x).toBeGreaterThan(editor.x);
	expect(toolbar.x + toolbar.width).toBeLessThanOrEqual(editor.x + editor.width);
	expect(day.width).toBe(32);
	expect(day.height).toBe(36);
	expect(titleStyles.border).toBe("none");
	expect(titleStyles.shadow).toBe("none");
	expect(titleStyles.background).toBe("rgba(0, 0, 0, 0)");
	expect(weekdayHeaders).toHaveLength(7);
	expect(firstWeekDays).toHaveLength(7);
	weekdayHeaders.forEach((position, index) =>
		expect(position).toBeCloseTo(firstWeekDays[index], 0),
	);
	const selectedStyles = await page.locator(".DayPicker-Day--selected").evaluate((element) => {
		const style = getComputedStyle(element);
		return {
			background: style.backgroundColor,
			shadow: style.boxShadow,
			border: style.borderStyle,
		};
	});
	expect(selectedStyles.background).toBe("rgba(0, 0, 0, 0)");
	expect(selectedStyles.shadow).toBe("none");
	expect(selectedStyles.border).toBe("none");
	await expect(page).toHaveScreenshot("diary-layout.png", { maxDiffPixels: 7_000 });
});

test("aligns formatting controls to a uniform grid", async (): Promise<void> => {
	const buttons = page.locator(".formatting-buttons .button");
	const icons = page.locator(".editor-toolbar svg");
	const buttonBoxes = await Promise.all(
		(await buttons.all()).map((button) => button.boundingBox()),
	);
	const iconBoxes = await Promise.all((await icons.all()).map((icon) => icon.boundingBox()));

	expect(buttonBoxes.length).toBeGreaterThanOrEqual(5);
	expect(iconBoxes.length).toBeGreaterThanOrEqual(5);
	const toolbarBox = await box(".editor-toolbar");
	for (const button of buttonBoxes) {
		expect(button).not.toBeNull();
		expect(button?.width).toBe(36);
		expect(button?.height).toBe(36);
		expect(button!.y).toBeGreaterThanOrEqual(toolbarBox.y);
		expect(button!.y + button!.height).toBeLessThanOrEqual(toolbarBox.y + toolbarBox.height);
	}
	for (const icon of iconBoxes) {
		expect(icon).not.toBeNull();
		expect(icon?.width).toBe(20);
		expect(icon?.height).toBe(20);
	}
	const toolbar = page.locator(".formatting-buttons");
	expect((await toolbar.boundingBox())?.height).toBe(36);
});
