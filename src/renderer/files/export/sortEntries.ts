import { compareEntries } from "../../utils/entries";
import { Entries, DiaryEntry } from "../../types";

/**
 * Convert an Entries object to an array of diary entries sorted by date
 */
export default function sortEntries(entries: Entries): [string, DiaryEntry][] {
	return Object.entries(entries).sort(compareEntries);
}
