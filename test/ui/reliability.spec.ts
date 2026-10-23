import { expect, test } from "@playwright/test";
import { _electron as electron, ElectronApplication, Page } from "playwright";
import { mkdtemp, rm, mkdir, readFile } from "fs/promises";
import os from "os";
import path from "path";

let app: ElectronApplication;
let child: ReturnType<ElectronApplication["process"]>;
let page: Page;
let directory: string;
const password = "reliability-password";
async function launch(): Promise<void> {
	app = await electron.launch({
		args: ["."],
		env: {
			...process.env,
			ELECTRON_USER_DATA_DIR: directory,
			MINI_DIARY_TEST_LOCALE: "zh-CN",
		},
	});
	child = app.process();
	page = await app.firstWindow();
}
test.beforeEach(async () => {
	directory = await mkdtemp(path.join(os.tmpdir(), "mini-diary-reliability-"));
	await launch();
	await page.locator('input[type="password"]').nth(0).fill(password);
	await page.locator('input[type="password"]').nth(1).fill(password);
	await page.locator(".password-creation-form button").click();
	await expect(page.locator(".editor")).toBeVisible();
});
test.afterEach(async () => {
	if (child && child.exitCode === null && child.signalCode === null) {
		child.kill("SIGKILL");
		await new Promise<void>((resolve) => child.once("exit", () => resolve()));
	}
	await rm(directory, { recursive: true, force: true });
});

test("new diaries support Chinese substring search and snippets", async () => {
	await page.locator(".lexical-content-editable").fill("今天去了公园散步");
	await expect(page.locator(".sidebar-save-state")).toHaveClass(/save-saved/);
	await page.locator(".search-input").fill("公园");
	await expect(page.locator(".search-result")).toHaveCount(1);
	await expect(page.locator(".search-summary mark")).toHaveText("公园");
});

test("settings trap focus, dismiss with Escape and restore the trigger", async () => {
	await page.locator(".app-icon-button").click();
	await expect(page.locator('.overlay-inner[role="dialog"]')).toBeVisible();
	for (let i = 0; i < 20; i += 1) {
		await page.keyboard.press("Tab");
		expect(
			await page.evaluate(() => Boolean(document.activeElement?.closest(".overlay-inner"))),
		).toBe(true);
	}
	await page.keyboard.press("Escape");
	await expect(page.locator(".overlay-inner")).toHaveCount(0);
	await expect(page.locator(".app-icon-button")).toBeFocused();
});

test("source editor preserves whitespace and the caret across autosaves", async () => {
	await page.locator(".editor-mode-switch button").last().click();
	const source = page.locator(".markdown-source");
	const cases = [
		{ before: "第一行\n- ", after: "列表项" },
		{ before: "第一行\n\n", after: "新段落" },
		{ before: "  缩进", after: "内容" },
		{ before: "行尾  ", after: "内容" },
	];

	for (const { before, after } of cases) {
		await source.fill(before);
		await page.waitForTimeout(700);
		await source.type(after);
		await expect(source).toHaveValue(before + after);
	}

	await source.fill("前段后段");
	await source.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(2, 2));
	await source.type("插入");
	await page.waitForTimeout(700);
	await expect(source).toHaveValue("前段插入后段");
	await expect
		.poll(() => source.evaluate((element: HTMLTextAreaElement) => element.selectionStart))
		.toBe(4);
	await source.type("继续");
	await expect(source).toHaveValue("前段插入继续后段");
});

test("title editor preserves a trailing space and the caret across autosaves", async () => {
	const title = page.locator(".editor-title-input");
	await title.fill("标题 ");
	await page.waitForTimeout(700);
	await title.type("后续");
	await expect(title).toHaveText("标题 后续");
});

test("advanced Markdown explicitly offers source editing", async () => {
	await page.locator(".editor-mode-switch button").last().click();
	await page.locator(".markdown-source").fill("| A | B |\n| --- | --- |\n| 1 | 2 |");
	await page.locator(".editor-mode-switch button").first().click();
	await expect(page.locator(".markdown-extended-preview table")).toBeVisible();
	await expect(page.locator(".formatting-buttons")).toHaveCount(0);
	await page.locator(".markdown-warning button").click();
	await expect(page.locator(".markdown-source")).toBeVisible();
});

test("link dialog validates URLs and applies a link to the selection", async () => {
	const editor = page.locator(".lexical-content-editable");
	await editor.fill("Example");
	await page.keyboard.press("ControlOrMeta+A");
	await page.locator(".toolbar-insert-group button").first().click();
	await expect(page.locator(".link-dialog")).toBeVisible();
	// eslint-disable-next-line no-script-url
	await page.locator(".link-dialog input").fill("javascript:alert(1)");
	await page.locator('.link-dialog button[type="submit"]').click();
	await expect(page.locator("#link-error")).toBeVisible();
	await page.locator(".link-dialog input").fill("https://example.com");
	await page.locator('.link-dialog button[type="submit"]').click();
	await expect(editor.locator("a")).toHaveAttribute("href", "https://example.com");
});

test("save failures remain visible, block closing and can be retried", async () => {
	await app.evaluate(({ ipcMain, dialog }) => {
		// Test-only fault injection: preserve and restore the registered IPC handler.
		// eslint-disable-next-line no-underscore-dangle
		const handlers = (ipcMain as unknown as { _invokeHandlers: Map<string, unknown> })
			._invokeHandlers;
		const original = handlers.get("diary:save");
		(globalThis as Record<string, unknown>).restoreDiarySave = () => {
			handlers.set("diary:save", original);
		};
		handlers.set("diary:save", async () => {
			throw Error("Simulated disk failure");
		});
		Object.defineProperty(dialog, "showErrorBox", { configurable: true, value: () => undefined });
	});
	await page.locator(".lexical-content-editable").fill("失败后仍需保留");
	await expect(page.locator(".sidebar-save-state")).toHaveClass(/save-error/);
	await app.evaluate(({ BrowserWindow }) => {
		BrowserWindow.getAllWindows()[0].close();
	});
	await expect(page.locator(".editor")).toBeVisible();
	await app.evaluate(() => {
		(globalThis as unknown as { restoreDiarySave: () => void }).restoreDiarySave();
	});
	await page.locator(".sidebar-save-state button").click();
	await expect(page.locator(".sidebar-save-state")).toHaveClass(/save-saved/);
});

test("closing immediately after typing persists the final draft", async () => {
	await page.locator(".lexical-content-editable").fill("最后一笔不能丢失");
	await app.evaluate(({ BrowserWindow }) => {
		BrowserWindow.getAllWindows()[0].close();
	});
	await expect.poll(() => child.exitCode).not.toBeNull();
	await launch();
	await page.locator(".password-prompt-form input").fill(password);
	await page.locator(".password-prompt-form button").click();
	await expect(page.locator(".lexical-content-editable")).toContainText("最后一笔不能丢失");
});

test("clearing a pending search restores the calendar", async () => {
	await page.locator(".lexical-content-editable").fill("公园散步");
	await expect(page.locator(".sidebar-save-state")).toHaveClass(/save-saved/);
	await page.locator(".search-input").fill("公园");
	await page.locator(".search-input-clear button").click();
	await page.waitForTimeout(650);
	await expect(page.locator(".sidebar-calendar")).toBeVisible();
	await expect(page.locator(".search-results")).toHaveCount(0);
});

test("auto theme follows system changes but explicit theme does not", async () => {
	await page.emulateMedia({ colorScheme: "light" });
	await page.locator(".app-icon-button").click();
	await page.locator("#radio-theme-auto").check();
	await page.emulateMedia({ colorScheme: "dark" });
	await expect(page.locator(".theme-dark")).toHaveCount(1);
	await page.locator("#radio-theme-light").check();
	await page.emulateMedia({ colorScheme: "light" });
	await page.emulateMedia({ colorScheme: "dark" });
	await expect(page.locator(".theme-light")).toHaveCount(1);
});

test("immediate export includes the pending source draft", async () => {
	await app.evaluate(({ ipcMain }) => {
		ipcMain.removeHandler("dialogs:export-file");
		ipcMain.handle("dialogs:export-file", (_, _name, _label, content) => {
			(globalThis as Record<string, unknown>).auditExport = content;
			return true;
		});
	});
	await page.locator(".editor-mode-switch button").last().click();
	await page.locator(".markdown-source").fill("立即导出的最后一笔");
	await app.evaluate(({ BrowserWindow }) =>
		BrowserWindow.getAllWindows()[0].webContents.send("exportMd"),
	);
	await expect
		.poll(() => app.evaluate(() => (globalThis as Record<string, unknown>).auditExport))
		.toContain("立即导出的最后一笔");
});

test("failed import keeps the overlay and committed content", async () => {
	await page.locator(".lexical-content-editable").fill("原有内容");
	await expect(page.locator(".sidebar-save-state")).toHaveClass(/save-saved/);
	await app.evaluate(({ ipcMain, dialog }) => {
		ipcMain.removeHandler("dialogs:import-file");
		ipcMain.handle("dialogs:import-file", () => "导入内容");
		ipcMain.removeHandler("dialogs:import-conflict");
		ipcMain.handle("dialogs:import-conflict", () => "replace");
		ipcMain.removeHandler("diary:replace-entries");
		ipcMain.handle("diary:replace-entries", () => {
			throw Error("Simulated import failure");
		});
		Object.defineProperty(dialog, "showErrorBox", { configurable: true, value: () => undefined });
	});
	await app.evaluate(({ BrowserWindow }) =>
		BrowserWindow.getAllWindows()[0].webContents.send("importMdSingle"),
	);
	await page.locator(".import-overlay .button-main").click();
	await expect(page.locator('.import-overlay [role="alert"]')).toContainText(
		"Simulated import failure",
	);
	await expect(page.locator(".lexical-content-editable")).toHaveText("原有内容");
});

test("mixed Markdown renders tables, formulas and diagrams safely", async () => {
	await page.locator(".editor-mode-switch button").last().click();
	await page
		.locator(".markdown-source")
		.fill(
			'# 标题\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n结束\n\n$$x^2$$\n\n```mermaid\ngraph TD\n A-->B\n```\n\n![x" onerror="alert(1)](data:image/png;base64,AAAA)',
		);
	await page.locator(".editor-mode-switch button").first().click();
	await expect(page.locator(".markdown-extended-preview table")).toHaveCount(1);
	await expect(page.locator(".markdown-extended-preview math")).toHaveCount(1);
	await expect(page.locator(".markdown-diagram svg")).toHaveCount(1);
	await expect(page.locator(".markdown-extended-preview img")).not.toHaveAttribute("onerror");
});

test("moved diary is found after restarting", async () => {
	await page.locator(".lexical-content-editable").fill("迁移后的日记");
	await expect(page.locator(".sidebar-save-state")).toHaveClass(/save-saved/);
	const destination = path.join(directory, "moved");
	await mkdir(destination);
	await page.evaluate((target) => window.miniDiary.diary.move(target), destination);
	child.kill("SIGKILL");
	await new Promise<void>((resolve) => child.once("exit", () => resolve()));
	await launch();
	await page.locator(".password-prompt-form input").fill(password);
	await page.locator(".password-prompt-form button").click();
	await expect(page.locator(".lexical-content-editable")).toHaveText("迁移后的日记");
});

test("PDF export renders a formatted document", async () => {
	await page.locator(".editor-mode-switch button").last().click();
	await page
		.locator(".markdown-source")
		.fill("# PDF heading\n\n| A | B |\n| --- | --- |\n| 1 | 2 |");
	const target = path.join(directory, "export.pdf");
	await app.evaluate(({ dialog }, filePath) => {
		Object.defineProperty(dialog, "showSaveDialog", {
			configurable: true,
			value: async () => ({ canceled: false, filePath }),
		});
	}, target);
	await app.evaluate(({ BrowserWindow }) =>
		BrowserWindow.getAllWindows()[0].webContents.send("exportPdf"),
	);
	await expect
		.poll(async () =>
			(await readFile(target).catch(() => Buffer.alloc(0))).subarray(0, 5).toString(),
		)
		.toBe("%PDF-");
});

test("successful replacement updates the rich editor and can be recovered", async () => {
	await page.locator(".lexical-content-editable").fill("恢复前的原文");
	await expect(page.locator(".sidebar-save-state")).toHaveClass(/save-saved/);
	await app.evaluate(({ ipcMain }) => {
		ipcMain.removeHandler("dialogs:import-file");
		ipcMain.handle("dialogs:import-file", () => "替换后的正文");
		ipcMain.removeHandler("dialogs:import-conflict");
		ipcMain.handle("dialogs:import-conflict", () => "replace");
	});
	await app.evaluate(({ BrowserWindow }) =>
		BrowserWindow.getAllWindows()[0].webContents.send("importMdSingle"),
	);
	await page.locator(".import-overlay .button-main").click();
	await expect(page.locator(".import-overlay")).toHaveCount(0);
	await expect(page.locator(".lexical-content-editable")).toHaveText("替换后的正文");
	await page.locator(".app-icon-button").click();
	await page.getByRole("tab", { name: "数据", exact: true }).click();
	await page.locator(".backup-recovery select").selectOption({ index: 1 });
	await page.locator(".backup-recovery input").fill(password);
	await page.locator(".backup-recovery button").click();
	await page.locator(".password-prompt-form input").fill(password);
	await page.locator(".password-prompt-form button").click();
	await expect(page.locator(".lexical-content-editable")).toHaveText("恢复前的原文");
});

test("settings categories keep navigation visible and support keyboard selection", async () => {
	await page.setViewportSize({ width: 500, height: 500 });
	await page.locator(".app-icon-button").click();
	await page.getByRole("tab", { name: "数据", exact: true }).click();
	await expect(page.locator(".backup-recovery")).toBeVisible();
	await page.getByRole("tabpanel").evaluate((element) => element.parentElement?.scrollTo(0, 1000));
	const width = await page
		.locator(".preferences-form")
		.evaluate((element) => ({ content: element.scrollWidth, visible: element.clientWidth }));
	expect(width.content).toBe(width.visible);
	await expect(page.getByRole("tab", { name: "外观", exact: true })).toBeInViewport();
	await expect(page.getByRole("button", { name: "关闭", exact: true })).toBeInViewport();
	await page.screenshot({ path: "audit-2026-10-22/fixed-settings.png" });
	await page.getByRole("tab", { name: "数据", exact: true }).press("ArrowRight");
	await expect(page.getByRole("tab", { name: "安全", exact: true })).toBeFocused();
	await expect(page.getByRole("tab", { name: "安全", exact: true })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.getByPlaceholder("新密码", { exact: true })).toBeVisible();
});

test("literal dollars in code remain rich-editable", async () => {
	await page.locator(".editor-mode-switch button").last().click();
	await page.locator(".markdown-source").fill('前文\n\n```js\nconst price = "$$";\n```\n\n后文');
	await page.locator(".editor-mode-switch button").first().click();
	await expect(page.locator(".lexical-content-editable")).toBeVisible();
	await expect(page.locator(".markdown-warning")).toHaveCount(0);
	await expect(page.locator(".lexical-code-block")).toContainText('const price = "$$";');
});

test("image insertion uses the caret and keeps rich text editable after restart", async () => {
	await app.evaluate(({ ipcMain }) => {
		ipcMain.removeHandler("dialogs:import-image");
		ipcMain.handle("dialogs:import-image", () => ({
			name: "测试.png",
			dataUrl:
				"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF1sAAAAASUVORK5CYII=",
		}));
	});
	const editor = page.locator(".lexical-content-editable");
	await editor.fill("前文后文");
	await editor.press("Home");
	await editor.press("ArrowRight");
	await editor.press("ArrowRight");
	await page.getByRole("button", { name: "插入图片", exact: true }).click();
	await expect(editor.locator("img")).toHaveCount(1);
	await expect(page.locator(".markdown-warning")).toHaveCount(0);
	await page.keyboard.type("继续写作");
	await page.locator(".editor-mode-switch button").last().click();
	await expect(page.locator(".markdown-source")).toHaveValue(
		/前文!\[测试\.png\]\(data:image\/png;base64,[^)]+\) 继续写作后文/,
	);
	await page.locator(".editor-mode-switch button").first().click();
	await expect(editor.locator("img")).toHaveCount(1);
	await expect(page.locator(".sidebar-save-state")).toHaveClass(/save-saved/);
	child.kill("SIGKILL");
	await new Promise<void>((resolve) => child.once("exit", () => resolve()));
	await launch();
	await page.locator(".password-prompt-form input").fill(password);
	await page.locator(".password-prompt-form button").click();
	await expect(page.locator(".lexical-content-editable img")).toHaveCount(1);
	await expect(page.locator(".lexical-content-editable")).toContainText("继续写作后文");
});

test("source image insertion preserves text on both sides of selection", async () => {
	await app.evaluate(({ ipcMain }) => {
		ipcMain.removeHandler("dialogs:import-image");
		ipcMain.handle("dialogs:import-image", () => ({
			name: "图片.png",
			dataUrl: "data:image/png;base64,AAAA",
		}));
	});
	await page.locator(".editor-mode-switch button").last().click();
	const source = page.locator(".markdown-source");
	await source.fill("前文后文");
	await source.press("Home");
	await source.press("ArrowRight");
	await source.press("ArrowRight");
	await page.getByRole("button", { name: "插入图片", exact: true }).click();
	await expect(source).toHaveValue("前文![图片.png](data:image/png;base64,AAAA)后文");
});

test("large photo import reduces dimensions before embedding", async () => {
	const fixture = path.join(directory, "large-photo.jpg");
	const encoded = await app.evaluate(({ nativeImage }) => {
		const pixels = Buffer.alloc(3000 * 1800 * 4);
		for (let index = 0; index < pixels.length; index += 4) {
			pixels[index] = index % 251;
			pixels[index + 1] = Math.floor(index / 128) % 251;
			pixels[index + 2] = 100;
			pixels[index + 3] = 255;
		}
		const original = nativeImage.createFromBitmap(pixels, { width: 3000, height: 1800 });
		return original.toJPEG(95).toString("base64");
	});
	await import("fs/promises").then(({ writeFile }) =>
		writeFile(fixture, Buffer.from(encoded, "base64")),
	);
	await app.evaluate(({ dialog }, target) => {
		Object.defineProperty(dialog, "showOpenDialog", {
			configurable: true,
			value: async () => ({ canceled: false, filePaths: [target] }),
		});
	}, fixture);
	await page.locator(".lexical-content-editable").fill("照片记录");
	await page.getByRole("button", { name: "插入图片", exact: true }).click();
	const image = page.locator(".lexical-content-editable img");
	await expect(image).toHaveCount(1);
	await expect
		.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
		.toBe(2560);
	await expect
		.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalHeight))
		.toBe(1536);
});

test("more formatting preserves the selection and supports keyboard dismissal", async () => {
	const editor = page.locator(".lexical-content-editable");
	await editor.fill("保留选区");
	await editor.press("ControlOrMeta+A");
	await page.getByRole("button", { name: "更多格式", exact: true }).click();
	await expect(page.getByRole("button", { name: "删除线", exact: true })).toBeFocused();
	await page.getByRole("button", { name: "删除线", exact: true }).press("Enter");
	await expect(editor.locator(".lexical-text-strikethrough")).toHaveText("保留选区");
	await expect(page.locator(".formatting-more-popover")).toHaveCount(0);
	await page.getByRole("button", { name: "更多格式", exact: true }).click();
	await page.getByRole("button", { name: "删除线", exact: true }).press("Escape");
	await expect(page.getByRole("button", { name: "更多格式", exact: true })).toBeFocused();
	await expect(page.locator(".formatting-more-popover")).toHaveCount(0);
});

test("settings can be reopened without the opening click dismissing the dialog", async () => {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		await page.locator(".app-icon-button").click();
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByRole("tab", { name: "外观", exact: true })).toBeVisible();
		await page.getByRole("dialog").press("Escape");
		await expect(page.getByRole("dialog")).toHaveCount(0);
	}
});
