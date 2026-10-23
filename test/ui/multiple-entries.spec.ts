import { expect, test } from "@playwright/test";
import { _electron as electron, ElectronApplication, Page } from "playwright";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";

const password = "multi-entry-test-password";
let app: ElectronApplication;
let page: Page;
let directory: string;

test.beforeAll(async () => {
	directory = await mkdtemp(path.join(os.tmpdir(), "dayleaf-multi-"));
	app = await electron.launch({
		args: ["."],
		env: { ...process.env, ELECTRON_USER_DATA_DIR: directory, LANG: "en_US.UTF-8", TZ: "UTC" },
	});
	page = await app.firstWindow();
	const passwords = page.locator('input[type="password"]');
	await passwords.nth(0).fill(password);
	await passwords.nth(1).fill(password);
	await page.locator(".password-creation-form button").click();
	await expect(page.locator(".editor-title-input")).toBeVisible();
});

test.afterAll(async () => {
	if (app) {
		const child = app.process();
		child?.kill("SIGKILL");
		await new Promise<void>((resolve) => {
			if (!child || child.exitCode !== null || child.signalCode !== null) resolve();
			else child.once("exit", () => resolve());
		});
	}
	if (directory) await rm(directory, { force: true, recursive: true });
});

test("creates, switches, searches and reloads independent articles on the same day", async () => {
	const title = page.locator(".editor-title-input");
	const body = page.locator(".lexical-content-editable");
	await title.fill("Morning walk");
	await body.fill("First article in the park");
	await expect(page.locator(".day-entry-new")).toBeEnabled();
	await page.locator(".day-entry-new").click();
	await expect(title).toHaveText("");
	await expect(page.locator(".day-entry-draft")).toBeVisible();
	await expect(page.locator(".day-entries-bar")).toContainText("1");
	await expect(page.locator(".day-entry-new")).toBeDisabled();
	await title.fill("Evening thoughts");
	await body.fill("Second article before switching");
	// Switch immediately, before the debounce expires. The outgoing draft must flush.
	await page.locator(".day-entry-item").filter({ hasText: "Morning walk" }).click();
	await expect(title).toHaveText("Morning walk");
	await expect(body).toHaveText("First article in the park");
	await page.locator(".day-entry-item").filter({ hasText: "Evening thoughts" }).click();
	await expect(body).toHaveText("Second article before switching");
	await expect(page.locator(".day-entry-item")).toHaveCount(2);
	await expect(page.locator(".word-count")).not.toHaveText(/^0 /);
	await expect(page.locator(".sidebar-save-state")).toHaveClass(/save-saved/);
	await page.locator(".calendar-nav-row button").first().click();
	await expect(title).toHaveText("");
	await page.locator(".calendar-today-button").click();
	await expect(title).toHaveText("Evening thoughts");
	await page.screenshot({ path: "test-results/multiple-entries.png" });
	await page.setViewportSize({ width: 500, height: 700 });
	await expect(page.locator(".day-entry-new")).toBeVisible();
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
		.toBe(true);
	await page.screenshot({ path: "test-results/multiple-entries-narrow.png" });
	await page.setViewportSize({ width: 1100, height: 600 });

	await page.reload();
	await page.locator('.password-prompt-form input[type="password"]').fill(password);
	await page.locator(".password-prompt-form button").click();
	await expect(page.locator(".day-entry-item")).toHaveCount(2);
	await page.locator(".day-entry-item").filter({ hasText: "Evening thoughts" }).click();
	await expect(body).toHaveText("Second article before switching");
	await page.locator(".search-input").fill("First article");
	await page.locator(".search-result button").filter({ hasText: "Morning walk" }).click();
	await expect(title).toHaveText("Morning walk");
	await expect(body).toHaveText("First article in the park");
});

test("empty drafts do not add articles and clearing one article preserves its sibling", async () => {
	await page.locator(".search-input").fill("");
	await page.locator(".day-entry-new").click();
	await expect(page.locator(".day-entries-bar")).toContainText("2");
	await page.locator(".day-entry-item").filter({ hasText: "Morning walk" }).click();
	await page.locator(".editor-title-input").fill("");
	await page.locator(".lexical-content-editable").click();
	await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
	await page.keyboard.press("Backspace");
	await expect(page.locator(".lexical-content-editable")).toHaveText("");
	await page.locator(".lexical-content-editable").blur();
	await expect(page.locator(".day-entries-bar")).toContainText("1");
	await page.locator(".day-entry-item").filter({ hasText: "Evening thoughts" }).click();
	await expect(page.locator(".lexical-content-editable")).toHaveText(
		"Second article before switching",
	);
});
