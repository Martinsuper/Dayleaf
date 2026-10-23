import { Entries, EntryId, DiaryEntry, Metadata } from "../renderer/types";
import { OverlayType } from "./types";

export const IPC = {
	app: {
		bootstrap: "app:bootstrap",
		closeReady: "app:close-ready",
		prepareClose: "app:prepare-close",
		toggleWindowSize: "app:toggle-window-size",
		openExternal: "app:open-external",
	},
	dialogs: {
		confirmReset: "dialogs:confirm-reset",
		importConflict: "dialogs:import-conflict",
		exportFile: "dialogs:export-file",
		exportPdf: "dialogs:export-pdf",
		importFile: "dialogs:import-file",
		importImage: "dialogs:import-image",
		selectDirectory: "dialogs:select-directory",
		showError: "dialogs:show-error",
	},
	diary: {
		create: "diary:create",
		listBackups: "diary:list-backups",
		restoreBackup: "diary:restore-backup",
		fileExists: "diary:file-exists",
		getPath: "diary:get-path",
		lock: "diary:lock",
		move: "diary:move",
		read: "diary:read",
		replaceEntries: "diary:replace-entries",
		reset: "diary:reset",
		save: "diary:save",
		setDirectory: "diary:set-directory",
		updatePassword: "diary:update-password",
	},
	preferences: { set: "preferences:set" },
} as const;

export type MenuEvent =
	| "nextDay"
	| "previousDay"
	| "goToToday"
	| "nextMonth"
	| "previousMonth"
	| "exportJsonMiniDiary"
	| "exportMd"
	| "exportPdf"
	| "exportTxtDayOne"
	| "importJsonDayOne"
	| "importJsonJrnl"
	| "importJsonMiniDiary"
	| "importMdMiniDiary"
	| "importMdSingle"
	| "importTxtDayOne"
	| "lock"
	| "openOverlay";

export interface DiaryPayload {
	entries: Entries;
	metadata: Metadata;
}

export interface DiaryEntryUpdate {
	entry: DiaryEntry | null;
	/** Stable article ID. The field name is retained for IPC compatibility. */
	indexDate: EntryId;
}

export interface PreferenceValues {
	allowFutureEntries: boolean;
	enableMarkdownShortcuts: boolean;
	enableSpellcheck: boolean;
	filePath: string;
	firstDayOfWeek: number | null;
	hideTitles: boolean;
	markdownEditorMode: "rich" | "source";
	theme: "auto" | "dark" | "light";
}

export interface BootstrapData {
	appName: string;
	lang: string;
	preferences: PreferenceValues;
	translations: Record<string, string>;
}

export interface MiniDiaryApi {
	app: {
		bootstrap: () => Promise<BootstrapData>;
		closeReady: (error?: string) => void;
		toggleWindowSize: () => Promise<void>;
		openExternal: (url: string) => Promise<boolean>;
	};
	dialogs: {
		importConflict: (
			dates: string[],
			added: number,
		) => Promise<"skip" | "replace" | "merge" | "cancel">;
		confirmReset: (
			title: string,
			message: string,
			confirm: string,
			cancel: string,
		) => Promise<boolean>;
		exportFile: (defaultName: string, buttonLabel: string, content: string) => Promise<boolean>;
		exportPdf: (defaultName: string, buttonLabel: string, markdown: string) => Promise<boolean>;
		importFile: (extension: "json" | "md" | "txt") => Promise<string | null>;
		importImage: () => Promise<{ dataUrl: string; name: string } | null>;
		selectDirectory: (buttonLabel: string) => Promise<string | null>;
		showError: (title: string, message: string) => Promise<void>;
	};
	diary: {
		listBackups: () => Promise<string[]>;
		restoreBackup: (name: string, password: string) => Promise<DiaryPayload>;
		create: (password: string) => Promise<DiaryPayload>;
		fileExists: () => Promise<boolean>;
		getPath: () => Promise<string>;
		lock: () => Promise<void>;
		move: (directory: string) => Promise<string>;
		read: (password: string) => Promise<DiaryPayload>;
		reset: () => Promise<void>;
		save: (update: DiaryEntryUpdate) => Promise<void>;
		replaceEntries: (entries: Entries) => Promise<void>;
		setDirectory: (directory: string) => Promise<void>;
		updatePassword: (password: string, entries: Entries) => Promise<DiaryPayload>;
	};
	events: {
		onPrepareClose: (listener: () => void) => () => void;
		onMenu: (listener: (event: MenuEvent, overlay?: OverlayType) => void) => () => void;
		onThemeChange: (listener: (theme: "light" | "dark") => void) => () => void;
	};
	preferences: {
		set: (
			key: keyof PreferenceValues,
			value: PreferenceValues[keyof PreferenceValues],
		) => Promise<void>;
	};
}
