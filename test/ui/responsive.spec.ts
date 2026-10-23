import { expect, test } from "@playwright/test";
import { _electron as electron, ElectronApplication, Page } from "playwright";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";

let app: ElectronApplication;
let page: Page;
let userDataDirectory: string;

test.beforeAll(async (): Promise<void> => {
	userDataDirectory = await mkdtemp(path.join(os.tmpdir(), "mini-diary-responsive-"));
	app = await electron.launch({
		args: ["."],
		env: {
			...process.env,
			ELECTRON_USER_DATA_DIR: userDataDirectory,
			LANG: "en_US.UTF-8",
			TZ: "UTC",
		},
	});
	page = await app.firstWindow();
	const passwords = page.locator('input[type="password"]');
	await passwords.nth(0).fill("responsive-password");
	await passwords.nth(1).fill("responsive-password");
	await page.locator(".password-creation-form button").click();
	await expect(page.locator(".editor")).toBeVisible();
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

test("keeps narrow layouts within the viewport", async (): Promise<void> => {
	for (const viewport of [
		{ width: 820, height: 700 },
		{ width: 810, height: 700 },
		{ width: 801, height: 700 },
		{ width: 800, height: 700 },
		{ width: 700, height: 700 },
		{ width: 500, height: 600 },
	]) {
		await page.setViewportSize(viewport);
		const geometry = await page.evaluate(() => ({
			diaryRight: document.querySelector(".diary")?.getBoundingClientRect().right ?? 0,
			documentWidth: document.documentElement.scrollWidth,
			viewportWidth: window.innerWidth,
		}));
		expect(geometry.documentWidth).toBe(geometry.viewportWidth);
		expect(geometry.diaryRight).toBeLessThanOrEqual(geometry.viewportWidth);
	}
});

test("allows every toolbar action to be reached on narrow screens", async (): Promise<void> => {
	await page.setViewportSize({ width: 500, height: 600 });
	const toolbar = page.locator(".formatting-buttons");
	const scrolling = await toolbar.evaluate((element) => ({
		range: element.scrollWidth - element.clientWidth,
	}));
	expect(scrolling.range).toBe(0);
	for (const button of await page
		.locator(".formatting-buttons button, .editor-toolbar-end button")
		.all()) {
		await expect(button).toBeInViewport();
	}
	await expect(page.locator(".editor-mode-switch button").last()).toBeInViewport();
	await page.screenshot({ path: "audit-2026-10-22/fixed-narrow-editor.png" });
	const editor = await page.locator(".editor").boundingBox();
	expect(editor!.x).toBeGreaterThanOrEqual(0);
	expect(editor!.x + editor!.width).toBeLessThanOrEqual(500);
});
