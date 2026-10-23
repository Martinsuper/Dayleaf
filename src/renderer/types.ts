// Diary

export type IndexDate = string;

export type EntryId = string;

export type TextFormat = "plain" | "markdown";

export interface DiaryEntry {
	/** Local calendar date. Missing only in legacy date-keyed files. */
	date?: string;
	/** Actual creation time; never inferred from a legacy modification time. */
	dateCreated?: string;
	dateUpdated: string;
	title: string;
	text: string;
	textFormat?: TextFormat;
	textFormatVersion?: number;
}

/** Maps stable article IDs to content; legacy IDs happen to be dates. */
export type Entries = Record<EntryId, DiaryEntry>;

export interface MiniDiaryJson {
	metadata: Metadata;
	entries: Entries;
}

export interface Metadata {
	application: string;
	version: string;
	dateUpdated: string;
}

// App

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Theme

export type Theme = "light" | "dark";

export type ThemePref = "auto" | Theme;

export type MarkdownEditorMode = "rich" | "source";

// Banner

export type BannerType = "error" | "info";

// Process status (import/export/encryption/decryption)

export type Status = "idle" | "inProgress" | "error";

// Import and export

export type ImportFormat =
	| "jsonDayOne"
	| "jsonJrnl"
	| "jsonMiniDiary"
	| "mdMiniDiary"
	| "mdSingle"
	| "txtDayOne";

export type ExportFormat = "jsonMiniDiary" | "md" | "pdf" | "txtDayOne";

export interface DayOneEntry {
	creationDevice: string;
	text: string;
	richText: string;
	uuid: string;
	modifiedDate: string;
	creationDeviceType: string;
	starred: boolean;
	duration: number;
	creationDeviceModel: string;
	creationDate: string;
	creationOSVersion: string;
	creationOSName: string;
	timeZone: string;
}

export interface DayOneJson {
	metadata: {
		version: string;
	};
	entries: DayOneEntry[];
}

export interface JrnlEntry {
	date: string;
	title: string;
	body: string;
	[key: string]: string;
}

export interface JrnlJson {
	tags: Record<string, string>;
	entries: JrnlEntry[];
}

// DiaryEntry after conversion of MiniDiaryJson's entries into array (required for MiniDiaryJson
// import)
export interface ListDiaryEntry extends DiaryEntry {
	indexDate: string;
}

export type ImportEntry = string | DayOneEntry | DiaryEntry | JrnlEntry;
