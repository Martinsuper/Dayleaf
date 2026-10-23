import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { createEditor } from "lexical";

import {
	MARKDOWN_NODES,
	MARKDOWN_TRANSFORMERS,
	normalizeMarkdown,
} from "../src/renderer/utils/markdown";

function roundTrip(markdown: string): string {
	const editor = createEditor({
		namespace: "test",
		nodes: MARKDOWN_NODES,
		onError: (error) => {
			throw error;
		},
	});
	editor.update(
		(): void => {
			$convertFromMarkdownString(markdown, MARKDOWN_TRANSFORMERS);
		},
		{ discrete: true },
	);
	let output = "";
	editor.getEditorState().read((): void => {
		output = normalizeMarkdown($convertToMarkdownString(MARKDOWN_TRANSFORMERS));
	});
	return output;
}

describe("Markdown editor conversion", () => {
	test.each([
		"Plain paragraph",
		"A **bold**, *italic*, ***bold italic*** and ~~struck~~ entry.",
		"# Heading one\n\n## Heading two\n\n### Heading three",
		"> A remembered quote",
		"Use `inline code` here.",
		"```ts\nconst answer = 42;\n```",
		"- first\n- second",
		"1. one\n2. two",
		"- [ ] open task\n- [x] finished task",
		"[Dayleaf](https://github.com/Martinsuper/Dayleaf)",
		"Before\n\n---\n\nAfter",
		"中文 **粗体** 与 *斜体*。",
	])("round trips %s", (markdown) => {
		expect(roundTrip(markdown)).toBe(markdown);
	});

	test("accepts underscore emphasis and normalizes it to canonical Markdown", () => {
		expect(roundTrip("A __bold__, _italic_ and ___bold italic___ entry.")).toBe(
			"A **bold**, *italic* and ***bold italic*** entry.",
		);
	});

	test("keeps incomplete Markdown as text", () => {
		expect(roundTrip("An **unfinished thought")).toBe("An \\*\\*unfinished thought");
	});
});

test("images remain image nodes and surrounding text survives rich conversion", () => {
	const image = "![我的\\[图片\\].png](data:image/png;base64,AAAA)";
	const output = roundTrip(`前文 ${image} 后文`);
	expect(output).toContain(image);
	expect(output).toContain("前文");
	expect(output).toContain("后文");
});
