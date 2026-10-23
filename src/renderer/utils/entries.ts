import { DiaryEntry, Entries } from "../types";

/** Legacy date keys remain stable IDs, while new entries use UUIDs. */
export function entryDate(id: string, entry: DiaryEntry): string {
	return entry.date || id;
}

export function entriesForDay(entries: Entries, date: string): [string, DiaryEntry][] {
	return Object.entries(entries)
		.filter(([id, entry]) => entryDate(id, entry) === date)
		.sort(
			(a, b) =>
				(a[1].dateCreated || "").localeCompare(b[1].dateCreated || "") || a[0].localeCompare(b[0]),
		);
}

export function compareEntries(a: [string, DiaryEntry], b: [string, DiaryEntry]): number {
	return (
		entryDate(...a).localeCompare(entryDate(...b)) ||
		(a[1].dateCreated || "").localeCompare(b[1].dateCreated || "") ||
		a[0].localeCompare(b[0])
	);
}
