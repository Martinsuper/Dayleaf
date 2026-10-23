import MarkdownIt from "markdown-it";
import { Entries } from "../../types";
import { escapeMarkdownText } from "../../utils/markdown";
import { createDate, parseDate, toIndexDate } from "../../utils/dateFormat";

const parser = new MarkdownIt();

function splitTitle(body: string): { title: string; text: string } {
	const trimmed = body.trim();
	const match = trimmed.match(/^#[ \t]+([^\n]+)(?:\n+|$)/);
	return match
		? {
				title: match[1].replace(/\\([\\`*_[\]<>#])/g, "$1"),
				text: trimmed.slice(match[0].length).trim(),
		  }
		: { title: "", text: trimmed };
}

function validateDate(value: string): string {
	const date = parseDate(value, "YYYY-MM-DD");
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !date.isValid() || toIndexDate(date) !== value)
		throw Error(`Invalid date: "${value}"`);
	return value;
}

export function parseSingleEntryMd(markdown: string, indexDate: string): Entries {
	return {
		[globalThis.crypto.randomUUID()]: {
			date: validateDate(indexDate),
			...splitTitle(markdown),
			dateUpdated: createDate().toString(),
			textFormat: "markdown",
			textFormatVersion: 1,
		},
	};
}

/** Unique markers survive external edits and cannot be confused with content from this export. */
function parseMarkedArchive(markdown: string, header: RegExpMatchArray): Entries {
	const boundary = header[1];
	const entries: Entries = {};
	let cursor = header[0].length;
	while (cursor < markdown.length) {
		const start = markdown
			.slice(cursor)
			.match(new RegExp(`^<!-- dayleaf-entry:${boundary}:([^\\r\\n]+) -->\\r?\\n`));
		if (!start) throw Error("Invalid Dayleaf Markdown entry marker");
		const meta = JSON.parse(decodeURIComponent(start[1]));
		if (
			!meta ||
			typeof meta.date !== "string" ||
			typeof meta.title !== "string" ||
			!["markdown", "plain"].includes(meta.textFormat)
		)
			throw Error("Invalid Dayleaf Markdown metadata");
		const date = validateDate(meta.date);
		const id = typeof meta.id === "string" && meta.id ? meta.id : date;
		if (entries[id]) throw Error(`Duplicate diary ID: ${id}`);
		const prefixStart = cursor + start[0].length;
		const bodyMarker = `<!-- dayleaf-body:${boundary} -->`;
		const bodyMarkerStart = markdown.indexOf(bodyMarker, prefixStart);
		const bodyStart =
			bodyMarkerStart < 0
				? null
				: markdown.slice(bodyMarkerStart).match(new RegExp(`^${bodyMarker}\\r?\\n`));
		if (!bodyStart) throw Error(`Missing diary body: ${date}`);
		const prefix = markdown.slice(prefixStart, bodyMarkerStart).replace(/\r\n?/g, "\n");
		const heading = prefix.match(new RegExp(`^## ${date} · [^\\n]*\\n\\n([\\s\\S]*)$`));
		if (!heading) throw Error(`Invalid diary heading: ${date}`);
		const textStart = bodyMarkerStart + bodyStart[0].length;
		const end = markdown
			.slice(textStart)
			.match(new RegExp(`\\r?\\n<!-- dayleaf-end:${boundary} -->\\r?\\n(?:\\r?\\n|$)`));
		if (!end || end.index === undefined) throw Error(`Incomplete diary entry: ${date}`);
		const shownTitle = heading[1].trim();
		const originalTitle = meta.title
			? `# ${escapeMarkdownText(meta.title).replace(/\r?\n/g, " ")}`
			: "";
		entries[id] = {
			date,
			...(typeof meta.dateCreated === "string" ? { dateCreated: meta.dateCreated } : {}),
			title: shownTitle === originalTitle ? meta.title : splitTitle(shownTitle).title,
			text: markdown.slice(textStart, textStart + end.index),
			textFormat: meta.textFormat,
			textFormatVersion: 1,
			dateUpdated:
				typeof meta.dateUpdated === "string" ? meta.dateUpdated : createDate().toString(),
		};
		cursor = textStart + end.index + end[0].length;
		if (cursor < markdown.length) {
			const separator = markdown.slice(cursor).match(/^---\r?\n\r?\n/);
			if (!separator) throw Error("Invalid Dayleaf Markdown separator");
			cursor += separator[0].length;
		}
	}
	if (!Object.keys(entries).length) throw Error("No Dayleaf date headings were found");
	return entries;
}

export function parseMiniDiaryMd(markdown: string): Entries {
	const archive = markdown.replace(/^\uFEFF/, "").trimStart();
	const header = archive.match(
		/^# Dayleaf\r?\n\r?\n<!-- dayleaf-format:2:([a-zA-Z0-9-]+) -->\r?\n\r?\n/,
	);
	if (header) return parseMarkedArchive(archive, header);
	if (/^# Dayleaf\r?\n\r?\n<!-- dayleaf-format:/.test(archive))
		throw Error("Unsupported or invalid Dayleaf Markdown archive header");
	// Legacy exports: only top-level headings count, and later entries require a separator.
	const normalized = markdown.replace(/\r\n?/g, "\n");
	const lines = normalized.split("\n");
	const offsets = [0];
	lines.forEach((line) => offsets.push(offsets[offsets.length - 1] + line.length + 1));
	const tokens = parser.parse(normalized, {});
	const boundaries: { date: string; content: number; separator: number }[] = [];
	tokens.forEach((token, index) => {
		if (token.type !== "heading_open" || token.tag !== "h2" || token.level !== 0 || !token.map)
			return;
		const match = tokens[index + 1]?.content.match(/^(\d{4}-\d{2}-\d{2})(?:[ \t]+·.*)?$/);
		if (!match) return;
		const previous = tokens[index - 1];
		if (boundaries.length && previous?.type !== "hr") return;
		boundaries.push({
			date: validateDate(match[1]),
			content: offsets[token.map[1]],
			separator:
				previous?.type === "hr" && previous.map ? offsets[previous.map[0]] : offsets[token.map[0]],
		});
	});
	if (!boundaries.length) throw Error("No Dayleaf date headings were found");
	const entries: Entries = {};
	boundaries.forEach((boundary, index) => {
		const id = entries[boundary.date] ? globalThis.crypto.randomUUID() : boundary.date;
		const end = boundaries[index + 1]?.separator ?? normalized.length;
		entries[id] = {
			date: boundary.date,
			...splitTitle(normalized.slice(boundary.content, end)),
			dateUpdated: createDate().toString(),
			textFormat: "markdown",
			textFormatVersion: 1,
		};
	});
	return entries;
}
