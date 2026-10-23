import MarkdownIt from "markdown-it";
import katex from "katex";

export interface MarkdownTable {
	header: string[];
	rows: string[][];
}

const parser = new MarkdownIt({ html: false, breaks: true, linkify: true });
const defaultFence = parser.renderer.rules.fence!;
parser.renderer.rules.fence = (tokens, index, options, env, renderer): string => {
	const token = tokens[index];
	if (token.info.trim() === "mermaid")
		return `<pre class="markdown-diagram" data-diagram="true">${parser.utils.escapeHtml(
			token.content,
		)}</pre>`;
	return defaultFence(tokens, index, options, env, renderer);
};
parser.block.ruler.before("fence", "math", (state, start, end, silent): boolean => {
	const first = state.src.slice(state.bMarks[start] + state.tShift[start], state.eMarks[start]);
	if (!first.startsWith("$$")) return false;
	let content = first.slice(2);
	let next = start + 1;
	if (content.trimEnd().endsWith("$$")) content = content.trimEnd().slice(0, -2);
	else {
		let closed = false;
		while (next < end) {
			const line = state.src.slice(state.bMarks[next], state.eMarks[next]);
			next += 1;
			if (line.trimEnd().endsWith("$$")) {
				content += `\n${line.trimEnd().slice(0, -2)}`;
				closed = true;
				break;
			}
			content += `\n${line}`;
		}
		if (!closed) return false;
	}
	if (silent) return true;
	const token = state.push("math", "", 0);
	token.content = content;
	Object.assign(state, { line: next });
	return true;
});
parser.renderer.rules.math = (tokens, index): string =>
	`<div class="markdown-math">${katex.renderToString(tokens[index].content, {
		displayMode: true,
		throwOnError: false,
		trust: false,
		output: "mathml",
	})}</div>`;

/** Parse tables with the same grammar used by the document preview. */
export function parseMarkdownTable(markdown: string): MarkdownTable | null {
	const tokens = parser.parse(markdown, {});
	if (tokens[0]?.type !== "table_open") return null;
	const rows: string[][] = [];
	let row: string[] = [];
	for (const token of tokens) {
		if (token.type === "table_close") break;
		if (token.type === "tr_open") row = [];
		if (token.type === "inline") row.push(token.content);
		if (token.type === "tr_close") rows.push(row);
	}
	return { header: rows[0], rows: rows.slice(1) };
}

/** Render untrusted Markdown with raw HTML disabled and attribute/URL escaping enabled. */
export function renderMarkdownPreview(markdown: string): string {
	return parser.render(markdown);
}

/** Use parsed blocks so code, inline code, escaped punctuation and literal pipes stay editable. */
export function containsUnsupportedMarkdown(markdown: string): boolean {
	return parser
		.parse(markdown, {})
		.some(
			(token) =>
				token.type === "table_open" ||
				token.type === "math" ||
				(token.type === "fence" && /^(mermaid|math)(?:\s|$)/i.test(token.info.trim())),
		);
}
