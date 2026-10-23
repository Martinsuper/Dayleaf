import fs from "fs/promises";
import path from "path";

import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import settings from "electron-settings";

import { IPC, PreferenceValues } from "../../shared/ipc";
import { getTranslations, getUsedLang } from "../i18n/i18n";
import DiaryService from "../services/diaryService";
import { prepareImportedImage } from "../services/imageImport";
import { getWindow } from "../window";

const defaults: PreferenceValues = {
	allowFutureEntries: false,
	enableMarkdownShortcuts: true,
	enableSpellcheck: true,
	filePath: "",
	firstDayOfWeek: null,
	hideTitles: false,
	markdownEditorMode: "rich",
	theme: "light",
};

function parentWindow(): BrowserWindow {
	return getWindow();
}

function preferences(): PreferenceValues {
	return Object.fromEntries(
		Object.entries(defaults).map(([key, value]) => [key, settings.get(key) ?? value]),
	) as PreferenceValues;
}

function exportExtension(defaultName: string): string {
	const extension = defaultName.split(".").pop();
	if (!extension || !/^[a-z0-9]+$/i.test(extension)) throw Error("Invalid export file name");
	return extension;
}

async function selectExportPath(defaultName: string, buttonLabel: string): Promise<string | null> {
	const extension = exportExtension(defaultName);
	const result = await dialog.showSaveDialog(parentWindow(), {
		buttonLabel,
		defaultPath: defaultName,
		filters: [{ extensions: [extension], name: extension.toUpperCase() }],
	});
	return result.canceled ? null : result.filePath || null;
}

export default function initIpcListeners(diary: DiaryService): void {
	// Serialize session-changing IPC operations with writes to avoid password/import races.
	let diaryOperations = Promise.resolve<unknown>(undefined);
	const handleDiary = (channel: string, handler: (...args: any[]) => unknown): void => {
		ipcMain.handle(channel, (event, ...args) => {
			if (event.sender !== parentWindow().webContents) throw Error("Invalid diary sender");
			const operation = diaryOperations.catch(() => undefined).then(() => handler(event, ...args));
			diaryOperations = operation;
			return operation;
		});
	};
	ipcMain.handle(IPC.diary.listBackups, () => diary.listBackups());
	handleDiary(IPC.diary.restoreBackup, (_, name: string, password: string) =>
		diary.restoreBackup(name, password),
	);
	ipcMain.handle(IPC.dialogs.importConflict, async (_, dates: string[], added: number) => {
		const chinese = getUsedLang().startsWith("zh");
		const result = await dialog.showMessageBox(parentWindow(), {
			type: "question",
			title: chinese ? "导入冲突" : "Import conflicts",
			message: chinese
				? `新增 ${added} 篇，${dates.length} 篇日记已存在`
				: `${added} new entries; ${dates.length} existing entries`,
			detail: dates.join("\n"),
			buttons: chinese
				? ["跳过已有篇目", "替换（保留加密备份）", "合并内容", "取消"]
				: ["Skip existing", "Replace (with encrypted backup)", "Merge", "Cancel"],
			defaultId: 0,
			cancelId: 3,
		});
		return ["skip", "replace", "merge", "cancel"][result.response];
	});
	ipcMain.handle(IPC.app.bootstrap, () => ({
		appName: app.name,
		lang: getUsedLang(),
		preferences: preferences(),
		translations: getTranslations(),
	}));
	ipcMain.handle(IPC.app.toggleWindowSize, (): void => {
		const win = parentWindow();
		if (win.isMaximized()) win.unmaximize();
		else win.maximize();
	});
	ipcMain.handle(IPC.app.openExternal, async (_, url: string): Promise<boolean> => {
		try {
			const { protocol } = new URL(url);
			if (!["http:", "https:", "mailto:"].includes(protocol)) return false;
			await shell.openExternal(url);
			return true;
		} catch (_) {
			return false;
		}
	});

	ipcMain.handle(IPC.dialogs.showError, (_, title: string, message: string) => {
		dialog.showErrorBox(title, message);
	});
	handleDiary(IPC.diary.create, (_, password: string) => diary.create(password));
	ipcMain.handle(IPC.diary.fileExists, () => diary.fileExists());
	handleDiary(IPC.diary.lock, () => diary.lock());
	handleDiary(IPC.diary.read, (_, password: string) => diary.read(password));
	handleDiary(IPC.diary.reset, () => diary.reset());
	handleDiary(IPC.diary.save, (_, update) => diary.save(update));
	handleDiary(IPC.diary.replaceEntries, (_, entries) => diary.replaceEntries(entries));
	handleDiary(IPC.diary.updatePassword, (_, password: string, entries) =>
		diary.updatePassword(password, entries),
	);

	ipcMain.handle(
		IPC.dialogs.confirmReset,
		async (
			_,
			title: string,
			message: string,
			confirm: string,
			cancel: string,
		): Promise<boolean> => {
			const result = await dialog.showMessageBox(parentWindow(), {
				buttons: [confirm, cancel],
				defaultId: 1,
				message,
				title,
				type: "warning",
			});
			return result.response === 0;
		},
	);
	ipcMain.handle(
		IPC.dialogs.selectDirectory,
		async (_, buttonLabel: string): Promise<string | null> => {
			const result = await dialog.showOpenDialog(parentWindow(), {
				buttonLabel,
				properties: ["openDirectory"],
			});
			return result.canceled ? null : result.filePaths[0];
		},
	);
	ipcMain.handle(
		IPC.dialogs.importFile,
		async (_, extension: "json" | "md" | "txt"): Promise<string | null> => {
			const result = await dialog.showOpenDialog(parentWindow(), {
				filters: [{ extensions: [extension], name: extension.toUpperCase() }],
				properties: ["openFile"],
			});
			return result.canceled ? null : fs.readFile(result.filePaths[0], "utf8");
		},
	);
	ipcMain.handle(
		IPC.dialogs.importImage,
		async (): Promise<{ dataUrl: string; name: string } | null> => {
			const result = await dialog.showOpenDialog(parentWindow(), {
				filters: [{ extensions: ["png", "jpg", "jpeg", "gif", "webp"], name: "Images" }],
				properties: ["openFile"],
			});
			if (result.canceled) return null;
			const filePath = result.filePaths[0];
			const { size } = await fs.stat(filePath);
			if (size > 10 * 1024 * 1024)
				throw Error(
					getUsedLang().startsWith("zh")
						? "图片不能超过 10 MB，请先缩小图片。"
						: "Images must be smaller than 10 MB. Please resize the image first.",
				);
			const extension = filePath.split(".").pop()?.toLowerCase() || "png";
			const image = prepareImportedImage(await fs.readFile(filePath), extension);
			return {
				dataUrl: `data:image/${image.mime};base64,${image.content.toString("base64")}`,
				name: filePath.split(/[\\/]/).pop() || "image",
			};
		},
	);
	ipcMain.handle(
		IPC.dialogs.exportFile,
		async (_, defaultName: string, buttonLabel: string, content: string): Promise<boolean> => {
			const filePath = await selectExportPath(defaultName, buttonLabel);
			if (!filePath) return false;
			await fs.writeFile(filePath, content, "utf8");
			return true;
		},
	);
	ipcMain.handle(
		IPC.dialogs.exportPdf,
		async (_, defaultName: string, buttonLabel: string, markdown: string): Promise<boolean> => {
			const filePath = await selectExportPath(defaultName, buttonLabel);
			if (!filePath) return false;
			const pdfWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
			try {
				await pdfWindow.loadFile(path.join(__dirname, "print.html"));
				await pdfWindow.webContents.executeJavaScript(
					`window.renderPrint(${JSON.stringify(markdown)})`,
				);
				await fs.writeFile(filePath, await pdfWindow.webContents.printToPDF({ pageSize: "A4" }));
				return true;
			} finally {
				pdfWindow.destroy();
			}
		},
	);

	ipcMain.handle(IPC.diary.getPath, (): string => diary.getDirectory());
	handleDiary(IPC.diary.move, async (_, directory: string): Promise<string> => {
		await diary.moveTo(directory);
		settings.set("filePath", diary.getDirectory());
		return diary.getDirectory();
	});
	handleDiary(IPC.diary.setDirectory, async (_, directory: string): Promise<void> => {
		await diary.setDirectory(directory);
		settings.set("filePath", diary.getDirectory());
	});

	ipcMain.handle(
		IPC.preferences.set,
		async (
			_,
			key: keyof PreferenceValues,
			value: PreferenceValues[keyof PreferenceValues],
		): Promise<void> => {
			if (!(key in defaults)) throw Error("Invalid preference");
			settings.set(key, value);
			if (key === "filePath") await diary.setDirectory(value as string);
		},
	);
}
