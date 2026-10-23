import {
	containsUnsupportedMarkdown,
	parseMarkdownTable,
	renderMarkdownPreview,
} from "../src/renderer/utils/markdownExtras";

test("parses a Markdown table", () => {
	expect(parseMarkdownTable("| Day | Mood |\n| --- | --- |\n| Mon | Great |")).toStrictEqual({
		header: ["Day", "Mood"],
		rows: [["Mon", "Great"]],
	});
});

test("renders extended Markdown without allowing raw HTML", () => {
	const preview = renderMarkdownPreview("<script>alert(1)</script>\n\n$$x + y$$");
	expect(preview).not.toContain("<script>");
	expect(preview).toContain("&lt;script&gt;");
	expect(preview).toContain('class="markdown-math"');
});

test("renders mixed blocks and encodes image attributes", () => {
	const html = renderMarkdownPreview(
		'# Title\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\nAfter\n\n![x" onerror="alert(1)](data:image/png;base64,AAAA)',
	);
	expect(html).toContain("<table>");
	expect(html).toContain("<p>After</p>");
	expect(html).toContain("&quot;");
	expect(html).not.toContain('alt="x" onerror=');
});

test("keeps code literal and renders real MathML", () => {
	expect(renderMarkdownPreview("```text\n**literal**\n```\n\n$$x^2$$")).toContain("<math");
	expect(renderMarkdownPreview("```text\n**literal**\n```")).not.toContain("<strong>");
});

describe("rich editor support detection", () => {
	test.each([
		'```js\nconst price = "$$";\n```',
		"`$$`",
		"\\$\\$",
		"普通 | 文本 | 仍可编辑",
		"![图片](data:image/png;base64,AAAA)",
	])("keeps literal content editable: %s", (text) =>
		expect(containsUnsupportedMarkdown(text)).toBe(false),
	);
	test.each(["| A | B |\n| --- | --- |\n| 1 | 2 |", "$$x^2$$", "```mermaid\ngraph TD\nA-->B\n```"])(
		"recognizes actual advanced blocks: %s",
		(text) => expect(containsUnsupportedMarkdown(text)).toBe(true),
	);
});
