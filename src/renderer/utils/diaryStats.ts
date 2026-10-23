import countWords from "word-count";
import moment from "moment-timezone";
import MarkdownIt from "markdown-it";
import { entryDate } from "./entries";
import { Entries } from "../types";

const parser = new MarkdownIt();

/** Visible content only: never expose image payloads or link destinations in previews. */
export function visibleMarkdownText(markdown: string): string {
	return parser
		.parse(markdown, {})
		.flatMap((token) => {
			if (token.type === "fence" || token.type === "code_block") return [token.content];
			return (token.children || [])
				.filter((child) => ["text", "code_inline"].includes(child.type))
				.map((child) => child.content);
		})
		.join(" ");
}

/** Count visible text, excluding image payloads, link destinations and Markdown punctuation. */
export function countEntryWords(title: string, markdown: string): number {
	return countWords(`${title}\n${visibleMarkdownText(markdown)}`);
}

/** Calculate streaks through today; future entries count toward totals but not streaks. */
export function calculateDiaryStats(entries: Entries, now = moment()) {
	const allDates = Object.entries(entries).map(([id, entry]) => entryDate(id, entry));
	const dates = [...new Set(allDates)].sort();
	const count = allDates.length;
	const elapsed = dates.filter((date) => moment(date, "YYYY-MM-DD").isSameOrBefore(now, "day"));
	let streak = 0;
	let longestStreak = 0;
	let previous: moment.Moment | undefined;
	for (const date of elapsed) {
		const current = moment(date, "YYYY-MM-DD");
		streak = previous && current.diff(previous, "days") === 1 ? streak + 1 : 1;
		longestStreak = Math.max(longestStreak, streak);
		previous = current;
	}
	const currentStreak =
		previous && now.clone().startOf("day").diff(previous, "days") <= 1 ? streak : 0;
	const nrWords = Object.values(entries).reduce(
		(sum, entry) => sum + countEntryWords(entry.title, entry.text),
		0,
	);
	const weeks = elapsed.length
		? Math.max(1, now.diff(moment(elapsed[0], "YYYY-MM-DD"), "weeks") + 1)
		: 1;
	return {
		nrEntries: count,
		nrDays: dates.length,
		avgEntriesPerWeek:
			allDates.filter((date) => moment(date, "YYYY-MM-DD").isSameOrBefore(now, "day")).length /
			weeks,
		longestStreak,
		currentStreak,
		nrWords,
		avgWordsPerEntry: count ? nrWords / count : 0,
	};
}
