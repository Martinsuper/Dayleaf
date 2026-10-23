import { Translations } from "../../../shared/types";

const translationsZhTw: Partial<Translations> = {
	"search-diary": "搜尋日記",
	"more-formatting": "更多格式",
	checklist: "待辦清單",
	"date-label": "日期",
	"year-label": "年份",
	"month-label": "月份",

	// Menu (defined by macOS)
	"about-app": "關於{appName}",
	"bring-all-to-front": "將此程式所有視窗移至最前",
	close: "關閉",
	copy: "拷貝",
	cut: "剪下",
	edit: "編輯",
	file: "檔案",
	help: "輔助說明",
	"hide-app": "隱藏{appName}",
	"hide-others": "隱藏其他",
	minimize: "縮到最小",
	paste: "貼上",
	preferences: "偏好設定",
	"saved-automatically": "已自動儲存",
	"save-dirty": "有未儲存修改",
	"save-saving": "正在儲存…",
	"save-error": "儲存失敗",
	"save-retry": "重試",
	"preview-readonly": "進階 Markdown 目前為唯讀預覽，請切換原始碼模式編輯。",
	"calendar-toggle": "展開 / 收起日曆",
	"link-invalid": "請輸入有效的 http、https 或 mailto 網址。",
	"link-apply": "套用連結",
	"quit-app": "結束{appName}",
	redo: "重做",
	"select-all": "全選",
	"show-all": "顯示全部",
	speech: "語音",
	"start-speaking": "開始朗讀",
	"stop-speaking": "停止朗讀",
	undo: "還原",
	view: "顯示方式",
	window: "視窗",
	zoom: "縮放",

	// Menu (app-specific)
	export: "輸出",
	"export-to-format": "輸出至{format}",
	import: "輸入⋯",
	"import-from-format": "從{format}輸入",
	license: "許可協議",
	"lock-diary": "鎖定日記",
	"next-day": "向後一天",
	"next-month": "向後一個月",
	"previous-day": "往回一天",
	"previous-month": "往回一個月",
	"privacy-policy": "隱私權政策",
	statistics: "統計數據",
	website: "官方網站",

	// Weekdays
	sunday: "星期日",
	monday: "星期一",
	tuesday: "星期二",
	wednesday: "星期三",
	thursday: "星期四",
	friday: "星期五",
	saturday: "星期六",

	// Theme
	dark: "深色",
	light: "淺色",
	theme: "主題",

	// Calendar
	today: "今天",

	// Editor
	"add-a-title": "新增標題",
	bold: "粗體",
	bullets: "項目清單",
	italic: "斜體",
	list: "編號清單",
	"write-something": "寫點什麼",
	"block-style": "段落樣式",
	"copy-markdown": "複製 Markdown",
	"copy-plain-text": "複製純文字",
	"editor-mode": "編輯模式",
	"enable-markdown-shortcuts": "輸入 Markdown 時自動格式化",
	"heading-1": "一級標題",
	"heading-2": "二級標題",
	"heading-3": "三級標題",
	"horizontal-rule": "分隔線",
	"import-instructions-markdown": "選擇由 Dayleaf 匯出的 Markdown 檔案，將依日期標題還原多篇日記。",
	"import-instructions-markdown-single":
		"選擇要匯入目前日期的 Markdown 檔案。檔案開頭的一級標題將作為日記標題。",
	"inline-code": "行內程式碼",
	"insert-image": "插入圖片",
	link: "連結",
	"link-prompt": "輸入安全的網頁或電子郵件地址",
	"markdown-source": "Markdown 原始碼",
	"markdown-help": "Markdown 說明",
	"unsupported-markdown": "部分進階 Markdown 語法只能在原始碼模式中保留。",
	"open-external-link": "開啟這個外部連結？",
	paragraph: "正文",
	quote: "引用",
	"rich-editor": "所見即所得",
	strikethrough: "刪除線",

	// Search
	clear: "清除",
	"no-results": "沒有結果",
	"no-title": "沒有標題",
	search: "搜尋",

	// Preferences
	"allow-future-entries": "允許新增未來的條目",
	auto: "自動",
	"diary-entries": "日記條目",
	"first-day-of-week": "一周的第一天",
	no: "取消",
	"reset-diary": "重置日記本",
	"reset-diary-confirm": "好，我確定",
	"reset-diary-msg": "你確定要重置日記本嗎？這個動作會刪除你所有的內容。檔案將無法取回。",

	// Password and directory
	"change-directory": "更改路徑",
	"change-password": "更換密碼",
	"choose-password": "請為您的日記設定一個密碼",
	"decryption-error": "加密過程中發生了錯誤",
	"diary-file": "日記檔案",
	"file-exists": "目標路徑已存在其它檔案",
	"move-error-msg": "搬移過程中發生了錯誤",
	"move-error-title": "搬移錯誤",
	"move-file": "搬移文件",
	"new-password": "新密碼",
	password: "密碼",
	"passwords-no-match": "密碼不符。",
	"repeat-new-password": "驗證新密碼",
	"repeat-password": "驗證",
	"select-directory": "選擇路徑",
	"set-password": "設定密碼",
	unlock: "解鎖",
	"wrong-password": "密碼錯誤",

	// Statistics
	"total-entries": "篇日記（總計）",
	"entries-per-week": "篇日記（每週）",
	"streak-best": "篇連續日記（紀錄）",
	"streak-current": "篇連續日記（當前）",
	"total-words": "個字（總計）",
	"words-per-entry": "個字（每篇平均）",

	// Import
	"import-error-msg": "輸入過程中發生了錯誤",
	"import-error-title": "輸入錯誤",
	"import-instructions-day-one":
		"打開 Day One ，依次點擊 File → Export → {format}，輸出檔案並且解壓縮，然後將解壓縮後的文件輸入 {appName} 。",
	"import-instructions-jrnl":
		"要輸出 jrnl 檔案，請執行命令 {command}. 然後將輸出的 JSON 檔案輸入 {appName} 。",
	"import-instructions-mini-diary":
		"你可以將之前由 {appName} 輸出的 JSON 檔案或者其它相同格式的 JSON 檔案輸入。",
	"start-import": "開始輸入",

	// Export
	"export-error-msg": "輸出過程中發生了錯誤",
	"export-error-title": "輸出錯誤",

	// Other
	loading: "讀取中",
};

export default translationsZhTw;
