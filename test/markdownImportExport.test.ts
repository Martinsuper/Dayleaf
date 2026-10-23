import { convertToMd } from "../src/renderer/files/export/md";
import { parseMiniDiaryMd, parseSingleEntryMd } from "../src/renderer/files/import/md";

const entries = {
	"2025-09-12": {
		dateUpdated: "now",
		title: "A *safe* title",
		text: "## Notes\n\n- first\n- second",
		textFormat: "markdown" as const,
		textFormatVersion: 1,
	},
};

test("exports and imports Dayleaf Markdown", async () => {
	const markdown = await convertToMd(entries);
	expect(markdown).toContain("## 2025-09-12 ·");
	expect(markdown).toContain("# A \\*safe\\* title");
	const imported = parseMiniDiaryMd(markdown);
	expect(imported["2025-09-12"].title).toBe("A *safe* title");
	expect(imported["2025-09-12"].text).toBe(entries["2025-09-12"].text);
});

test("imports one Markdown document into a selected day", () => {
	const imported = parseSingleEntryMd("# My day\n\nA **good** day.", "2025-09-13");
	expect(Object.values(imported)[0].title).toBe("My day");
	expect(Object.values(imported)[0].text).toBe("A **good** day.");
});

test.each([
	{ title: "只有标题", text: "" },
	{ title: "", text: "# 正文中的一级标题\n\n正文" },
	{ title: "标题", text: "正文\n\n---" },
	{ title: "标题", text: "  首段\n\n```md\n## 2026-10-19\n---\n\n## 2026-10-18\n```\n\n尾部  \n" },
	{ title: "标题", text: "未闭合代码块\n\n```js\n## 2026-10-19" },
	{ title: "多行\n标题", text: "<!-- dayleaf-entry:fake -->\n\n## 2026-10-18" },
])("preserves arbitrary entry content in Markdown archives: %p", async ({ title, text }) => {
	const original = {
		"2026-10-20": { title, text, dateUpdated: "now", textFormat: "markdown" as const },
		"2026-10-21": { title: "下一篇", text: "保留内容", dateUpdated: "now" },
	};
	const restored = parseMiniDiaryMd(await convertToMd(original));
	expect(Object.keys(restored)).toHaveLength(2);
	expect(restored["2026-10-20"]).toMatchObject({ title, text });
	expect(restored["2026-10-21"].text).toBe("保留内容");
});

test("legacy Markdown ignores date headings inside code and preserves final rule", () => {
	const legacy =
		"# Dayleaf\n\n## 2026-10-20 · 星期二\n\n# 标题\n\n```md\n## 2026-10-19\n```\n\n---\n\n## 2026-10-21 · 星期三\n\n# 只有标题\n\n---";
	const result = parseMiniDiaryMd(legacy);
	expect(Object.keys(result)).toEqual(["2026-10-20", "2026-10-21"]);
	expect(result["2026-10-20"].text).toBe("```md\n## 2026-10-19\n```");
	expect(result["2026-10-21"].text).toBe("---");
	expect(parseMiniDiaryMd("## 2026-10-20\n\n# 只有标题")["2026-10-20"].title).toBe("只有标题");
});

test("keeps same-day legacy articles separately and rejects invalid dates", () => {
	const imported = parseMiniDiaryMd("## 2026-10-20\n\n正文\n\n---\n\n## 2026-10-20\n\n另一篇");
	expect(Object.values(imported).map((entry) => entry.text)).toEqual(["正文", "另一篇"]);
	expect(() => parseMiniDiaryMd("## 2026-02-30\n\n正文")).toThrow(/Invalid date/);
});

test("PDF rendering receives readable Markdown without archive metadata", async () => {
	const output = await convertToMd(entries, false);
	expect(output).not.toContain("<!-- dayleaf-");
	expect(output).toContain("## 2025-09-12");
});

test("marked archives accept body and title edits made in another Markdown editor", async () => {
	const output = await convertToMd({
		"2026-10-20": { title: "原标题", text: "原正文", dateUpdated: "now" },
	});
	const edited = output
		.replace("# 原标题\n", "# 修改后的标题\n")
		.replace("原正文", "更多正文\n\n## 2026-10-19\n\n---");
	const restored = parseMiniDiaryMd(edited);
	expect(Object.keys(restored)).toEqual(["2026-10-20"]);
	expect(restored["2026-10-20"]).toMatchObject({
		title: "修改后的标题",
		text: "更多正文\n\n## 2026-10-19\n\n---",
	});
});

test("marked archives remain importable after a CRLF line-ending conversion", async () => {
	const output = await convertToMd({
		"2026-10-20": { title: "标题", text: "第一段\n\n第二段", dateUpdated: "now" },
	});
	expect(parseMiniDiaryMd(output.replace(/\n/g, "\r\n"))["2026-10-20"]).toMatchObject({
		title: "标题",
		text: "第一段\r\n\r\n第二段",
	});
});

test("recognizes marked archives with a UTF-8 BOM and leading whitespace", async () => {
	const output = await convertToMd(entries);
	expect(parseMiniDiaryMd(`\uFEFF\n${output}`)["2025-09-12"].title).toBe(
		entries["2025-09-12"].title,
	);
});

test("rejects damaged archive headers instead of importing marker comments as body text", async () => {
	const output = await convertToMd(entries);
	expect(() => parseMiniDiaryMd(output.replace("dayleaf-format:2:", "dayleaf-format:99:"))).toThrow(
		/header/,
	);
});
