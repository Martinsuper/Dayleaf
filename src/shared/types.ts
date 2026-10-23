// General types

export interface JsonObject {
	[x: string]: JsonValue;
}
export type JsonArray = Array<JsonValue>;
export type JsonValue = string | number | boolean | null | JsonArray | JsonObject;

// Overlay

export type OverlayType = "none" | "go-to-date" | "import" | "preferences" | "statistics";

// I18n

export interface Translations {
	"more-formatting": string;
	"search-diary": string;
	"date-label": string;
	"year-label": string;
	"month-label": string;
	// Menu (defined by macOS)
	"about-app": string;
	"bring-all-to-front": string;
	close: string;
	copy: string;
	cut: string;
	edit: string;
	file: string;
	help: string;
	"hide-app": string;
	"hide-others": string;
	minimize: string;
	paste: string;
	preferences: string;
	"quit-app": string;
	redo: string;
	"select-all": string;
	"show-all": string;
	speech: string;
	"start-speaking": string;
	"stop-speaking": string;
	undo: string;
	view: string;
	window: string;
	zoom: string;

	// Menu (app-specific)
	export: string;
	"export-to-format": string;
	"go-to-date": string;
	"go-to-today": string;
	import: string;
	"import-from-format": string;
	license: string;
	"lock-diary": string;
	"next-day": string;
	"next-month": string;
	"previous-day": string;
	"previous-month": string;
	"privacy-policy": string;
	statistics: string;
	website: string;

	// Weekdays
	sunday: string;
	monday: string;
	tuesday: string;
	wednesday: string;
	thursday: string;
	friday: string;
	saturday: string;

	// Theme
	dark: string;
	light: string;
	theme: string;

	// Calendar
	today: string;

	// App chrome
	appearance: string;
	"appearance-settings": string;
	"personal-journal": string;
	"saved-automatically": string;
	"save-dirty": string;
	"save-saving": string;
	"save-error": string;
	"save-retry": string;
	"preview-readonly": string;
	"calendar-toggle": string;
	"link-invalid": string;
	"link-apply": string;
	system: string;

	// Editor
	"add-a-title": string;
	bold: string;
	bullets: string;
	checklist: string;
	italic: string;
	list: string;
	"write-something": string;
	"block-style": string;
	"copy-markdown": string;
	"copy-plain-text": string;
	"editor-mode": string;
	"enable-markdown-shortcuts": string;
	"heading-1": string;
	"heading-2": string;
	"heading-3": string;
	"horizontal-rule": string;
	"import-instructions-markdown": string;
	"import-instructions-markdown-single": string;
	"inline-code": string;
	"insert-image": string;
	link: string;
	"link-prompt": string;
	"markdown-source": string;
	"markdown-help": string;
	"unsupported-markdown": string;
	"open-external-link": string;
	paragraph: string;
	quote: string;
	"rich-editor": string;
	strikethrough: string;
	"word-count": string;

	// Search
	clear: string;
	"no-results": string;
	"no-title": string;
	search: string;

	// Preferences
	"allow-future-entries": string;
	auto: string;
	"diary-entries": string;
	"enable-spellcheck": string;
	"first-day-of-week": string;
	"hide-titles": string;
	no: string;
	ok: string;
	"reset-diary": string;
	"reset-diary-confirm": string;
	"reset-diary-msg": string;

	// Password and directory
	"change-directory": string;
	"change-password": string;
	"choose-password": string;
	"decryption-error": string;
	"diary-file": string;
	"file-exists": string;
	"move-error-msg": string;
	"move-error-title": string;
	"move-file": string;
	"new-password": string;
	password: string;
	"passwords-no-match": string;
	"repeat-new-password": string;
	"repeat-password": string;
	"select-directory": string;
	"set-password": string;
	unlock: string;
	"wrong-password": string;

	// Statistics
	"total-entries": string;
	"entries-per-week": string;
	"streak-best": string;
	"streak-current": string;
	"total-words": string;
	"words-per-entry": string;

	// Import
	"import-error-msg": string;
	"import-error-title": string;
	"import-instructions-day-one": string;
	"import-instructions-jrnl": string;
	"import-instructions-mini-diary": string;
	"start-import": string;

	// Export
	"export-error-msg": string;
	"export-error-title": string;

	// Other
	loading: string;
}
