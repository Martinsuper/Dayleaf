import moment from "moment-timezone";
import { Entries } from "../src/renderer/types";
import { entriesForDay } from "../src/renderer/utils/entries";
import { calculateDiaryStats, visibleMarkdownText } from "../src/renderer/utils/diaryStats";
import { convertToMiniDiaryJson } from "../src/renderer/files/export/json";
import { convertToMd } from "../src/renderer/files/export/md";
import { convertToDayOneTxt } from "../src/renderer/files/export/txt";
import { parseMiniDiaryJson, parseJrnlJson } from "../src/renderer/files/import/json";
import { parseMiniDiaryMd, parseSingleEntryMd } from "../src/renderer/files/import/md";
import { parseDayOneTxt } from "../src/renderer/files/import/txt";
import {
	createIndex,
	searchIndex,
	clearIndex,
	cancelIndexUpdates,
} from "../src/renderer/utils/searchIndex";
import { updateEntry } from "../src/renderer/store/file/actionCreators";
import { RootState, ThunkDispatchT } from "../src/renderer/store/store";

afterEach(() => cancelIndexUpdates());

const entries: Entries = {
	"2026-10-22": { title: "Legacy", text: "Yesterday", dateUpdated: "2026-10-22" },
	morning: {
		date: "2026-10-23",
		dateCreated: "2026-10-23T01:00:00Z",
		dateUpdated: "2026-10-23T02:00:00Z",
		title: "Morning",
		text: "公园晨跑",
		textFormat: "markdown",
	},
	evening: {
		date: "2026-10-23",
		dateCreated: "2026-10-23T11:00:00Z",
		dateUpdated: "2026-10-23T12:00:00Z",
		title: "Evening",
		text: "公园散步",
		textFormat: "markdown",
	},
};

test("groups legacy and UUID articles by date, keeping creation order", () => {
	expect(entriesForDay(entries, "2026-10-23").map(([id]) => id)).toEqual(["morning", "evening"]);
	expect(entriesForDay(entries, "2026-10-22")[0][0]).toBe("2026-10-22");
});

test("counts articles independently while deduplicating days and streaks", () => {
	expect(calculateDiaryStats(entries, moment("2026-10-23"))).toMatchObject({
		nrEntries: 3,
		nrDays: 2,
		currentStreak: 2,
		longestStreak: 2,
		avgEntriesPerWeek: 3,
	});
});

test("JSON and Markdown archives preserve every same-day ID and timestamp", async () => {
	for (const restored of [
		parseMiniDiaryJson(await convertToMiniDiaryJson(entries)),
		parseMiniDiaryMd(await convertToMd(entries)),
	]) {
		expect(Object.keys(restored)).toHaveLength(3);
		expect(restored.morning).toMatchObject(entries.morning);
		expect(restored.evening).toMatchObject(entries.evening);
		expect(restored["2026-10-22"].dateCreated).toBeUndefined();
	}
});

test("external JSON and text imports do not merge same-day articles", async () => {
	const jrnl = parseJrnlJson(
		JSON.stringify({
			entries: [
				{ date: "2026-10-23", title: "Morning", body: "One" },
				{ date: "2026-10-23", title: "Evening", body: "Two" },
			],
		}),
	);
	expect(
		entriesForDay(jrnl, "2026-10-23")
			.map(([, entry]) => entry.title)
			.sort(),
	).toEqual(["Evening", "Morning"]);
	const txt = parseDayOneTxt(await convertToDayOneTxt(entries));
	expect(entriesForDay(txt, "2026-10-23")).toHaveLength(2);
	const first = parseSingleEntryMd("# Imported\n\nOne", "2026-10-23");
	const second = parseSingleEntryMd("# Imported\n\nTwo", "2026-10-23");
	expect(Object.keys(first)[0]).not.toBe(Object.keys(second)[0]);
});

test("search returns both article IDs, ordered by date and creation time", async () => {
	await createIndex(entries);
	expect(searchIndex("公园")).toEqual(["evening", "morning"]);
	await clearIndex();
});

test("updating one article preserves its creation time and its same-day sibling", () => {
	const actions: { type: string; payload?: { entries: Entries } }[] = [];
	const dispatch = ((action: unknown) => {
		if (typeof action !== "function") actions.push(action as (typeof actions)[number]);
	}) as ThunkDispatchT;
	const state = { file: { entries, isUnlocked: true } } as RootState;
	updateEntry("morning", "Updated", "New text", "2026-10-23")(dispatch, () => state, undefined);
	const updated = actions.find((action) => action.type === "SET_ENTRIES")!.payload!.entries;
	expect(updated.morning.dateCreated).toBe(entries.morning.dateCreated);
	expect(updated.morning.date).toBe("2026-10-23");
	expect(updated.evening).toEqual(entries.evening);
	updateEntry(
		"2026-10-22",
		"Updated legacy",
		"Text",
		"2026-10-22",
	)(dispatch, () => state, undefined);
	expect(actions[1].payload!.entries["2026-10-22"].dateCreated).toBeUndefined();
});

test("importing a different ID on the same day appends without a conflict prompt", async () => {
	const { mergeUpdateFile } = await import("../src/renderer/store/file/actionCreators");
	const importConflict = jest.fn();
	const replaceEntries = jest.fn().mockResolvedValue(undefined);
	const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: { miniDiary: { dialogs: { importConflict }, diary: { replaceEntries } } },
	});
	let state = {
		file: { entries, isUnlocked: true },
		diary: { dateSelected: moment("2026-10-23") },
	} as RootState;
	const dispatch = ((action: any): any => {
		if (typeof action === "function") return action(dispatch, () => state, undefined);
		if (action.payload?.entries)
			state = { ...state, file: { ...state.file, entries: action.payload.entries } };
		return action;
	}) as ThunkDispatchT;
	try {
		await mergeUpdateFile({
			another: { date: "2026-10-23", dateUpdated: "now", title: "Imported", text: "Third article" },
		})(dispatch, () => state, undefined);
		expect(importConflict).not.toHaveBeenCalled();
		expect(Object.keys(state.file.entries)).toHaveLength(4);
		expect(state.file.entries.morning).toEqual(entries.morning);
		expect(state.file.entries.evening).toEqual(entries.evening);
		expect(replaceEntries).toHaveBeenCalledWith(state.file.entries);
	} finally {
		if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
		else Reflect.deleteProperty(globalThis, "window");
		await clearIndex();
	}
});

test("article summaries exclude Markdown image payloads and link destinations", () => {
	const summary = visibleMarkdownText(
		"![photo](data:image/png;base64,PRIVATE)\n\nVisit [the park](https://example.com/hidden)",
	);
	expect(summary).toContain("the park");
	expect(summary).not.toMatch(/PRIVATE|https|data:image/);
});
