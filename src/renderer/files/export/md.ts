import { entryDate } from "../../utils/entries";
import { Entries } from "../../types";
import { fromIndexDate, toLocaleWeekday } from "../../utils/dateFormat";
import { escapeMarkdownText } from "../../utils/markdown";
import sortEntries from "./sortEntries";

export function convertToMd(entries: Entries, includeMetadata = true): Promise<string> {
	const containsBoundary = (candidate: string): boolean =>
		Object.values(entries).some(
			(entry) => entry.title.includes(candidate) || entry.text.includes(candidate),
		);
	let boundary = includeMetadata ? globalThis.crypto.randomUUID() : "";
	while (includeMetadata && containsBoundary(boundary)) boundary = globalThis.crypto.randomUUID();
	const content = [
		includeMetadata ? `# Dayleaf\n\n<!-- dayleaf-format:2:${boundary} -->\n\n` : "# Dayleaf\n\n",
	];
	const sorted = sortEntries(entries);
	sorted.forEach(([indexDate, entry], index): void => {
		const { text, title } = entry;
		const date = entryDate(indexDate, entry);
		const prefix = `## ${date} · ${toLocaleWeekday(fromIndexDate(date))}\n\n${
			title ? `# ${escapeMarkdownText(title).replace(/\n/g, " ")}\n\n` : ""
		}`;
		const metadata = {
			date,
			id: indexDate,
			dateCreated: entry.dateCreated,
			dateUpdated: entry.dateUpdated,
			title,
			textFormat: entry.textFormat || "markdown",
		};
		if (includeMetadata)
			content.push(
				`<!-- dayleaf-entry:${boundary}:${encodeURIComponent(JSON.stringify(metadata))} -->\n`,
			);
		content.push(prefix);
		if (includeMetadata) content.push(`<!-- dayleaf-body:${boundary} -->\n`);
		content.push(text);
		if (includeMetadata) content.push(`\n<!-- dayleaf-end:${boundary} -->`);
		content.push("\n\n");
		if (index < sorted.length - 1) content.push("---\n\n");
	});
	return Promise.resolve(content.join(""));
}
