import fs from "fs";
import { Entries } from "../src/renderer/types";

import {
	parseDayOneJson,
	parseJrnlJson,
	parseMiniDiaryJson,
} from "../src/renderer/files/import/json";
import { parseDayOneTxt } from "../src/renderer/files/import/txt";
import { referenceDataMd, referenceDataTxt } from "./import-export/referenceData";
import {
	ENCODING,
	PATH_JSON_DAY_ONE,
	PATH_JSON_JRNL,
	PATH_JSON_MINI_DIARY,
	PATH_TXT_DAY_ONE,
} from "./setup/constants";

function byDate(entries: Entries): Entries {
	return Object.fromEntries(Object.values(entries).map((entry) => [entry.date!, entry]));
}

test("JSON (Day One) import", () => {
	const dayOneJsonStr = fs.readFileSync(PATH_JSON_DAY_ONE, ENCODING);
	const parsed = parseDayOneJson(dayOneJsonStr);
	expect(byDate(parsed)).toMatchObject(referenceDataMd);
});

test("JSON (jrnl) import", () => {
	const jrnlJsonStr = fs.readFileSync(PATH_JSON_JRNL, ENCODING);
	const parsed = parseJrnlJson(jrnlJsonStr);
	expect(byDate(parsed)).toMatchObject(referenceDataTxt);
});

test("JSON (Dayleaf) import", () => {
	const miniDiaryJsonStr = fs.readFileSync(PATH_JSON_MINI_DIARY, ENCODING);
	const parsed = parseMiniDiaryJson(miniDiaryJsonStr);
	expect(byDate(parsed)).toMatchObject(referenceDataMd);
});

test("TXT (Day One) import", () => {
	const dayOneTxtStr = fs.readFileSync(PATH_TXT_DAY_ONE, ENCODING);
	const parsed = parseDayOneTxt(dayOneTxtStr);
	expect(byDate(parsed)).toMatchObject(referenceDataTxt);
});
