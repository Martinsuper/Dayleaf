import { ImportEntry, DiaryEntry, Entries } from "../../types";

/** External formats have no Dayleaf identity. Keep every article independently. */
export default function buildEntries(
	parsedEntries: ImportEntry[],
	getContent: (parsedEntry: ImportEntry) => { indexDate: string; entry: DiaryEntry },
): Entries {
	const entries: Entries = {};
	parsedEntries.forEach((parsedEntry) => {
		const { indexDate, entry } = getContent(parsedEntry);
		entries[globalThis.crypto.randomUUID()] = { ...entry, date: entry.date || indexDate };
	});
	return entries;
}
