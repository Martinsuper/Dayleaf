import { entryDate } from "../../utils/entries";
import { Entries } from "../../types";
import { fromIndexDate, toDayOneDate } from "../../utils/dateFormat";
import mdToTxt from "../../utils/mdToTxt";
import sortEntries from "./sortEntries";

export async function convertToDayOneTxt(entries: Entries): Promise<string> {
	const content: string[] = [];

	for (const [indexDate, entry] of sortEntries(entries)) {
		const { text, title } = entry;
		const date = entryDate(indexDate, entry);
		content.push(`\tDate:\t${toDayOneDate(fromIndexDate(date))}\n\n`);
		if (title) {
			content.push(`${title}\n\n`);
		}
		if (text) {
			// eslint-disable-next-line no-await-in-loop
			content.push(`${await mdToTxt(text)}\n\n`);
		}
		content.push("\n");
	}

	return content.join("");
}
