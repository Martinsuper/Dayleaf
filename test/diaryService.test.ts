import fs, { mkdtemp, readFile, rm, mkdir } from "fs/promises";
import os from "os";
import path from "path";

import { app } from "electron";

import DiaryService from "../src/main/services/diaryService";

const password = "test-password";
let directory: string;

beforeEach(async (): Promise<void> => {
	directory = await mkdtemp(path.join(os.tmpdir(), "mini-diary-service-"));
	jest.spyOn(app, "getPath").mockReturnValue(directory);
	jest.spyOn(app, "getVersion").mockReturnValue("0.0.0-test");
	Object.defineProperty(app, "name", { configurable: true, value: "Dayleaf" });
});

afterEach(async (): Promise<void> => {
	jest.restoreAllMocks();
	await rm(directory, { force: true, recursive: true });
});

test("persists the newest queued entry update", async (): Promise<void> => {
	const diary = new DiaryService();
	await diary.create(password);
	diary.save({
		entry: { dateUpdated: "first", text: "first", title: "First" },
		indexDate: "2026/09/03",
	});
	diary.save({
		entry: { dateUpdated: "second", text: "second", title: "Second" },
		indexDate: "2026/09/03",
	});
	await diary.flush();

	const reopened = new DiaryService();
	await expect(reopened.read(password)).resolves.toMatchObject({
		entries: { "2026/09/03": { dateUpdated: "second", text: "second", title: "Second" } },
	});
});

test("rejects an incorrect password without altering the encrypted file", async (): Promise<void> => {
	const diary = new DiaryService();
	await diary.create(password);
	diary.save({
		entry: { dateUpdated: "now", text: "secret", title: "Private" },
		indexDate: "2026/09/03",
	});
	await diary.flush();
	const stored = await readFile(path.join(directory, "mini-diary.txt"), "utf8");

	const reopened = new DiaryService();
	await expect(reopened.read("incorrect-password")).rejects.toThrow();
	await expect(readFile(path.join(directory, "mini-diary.txt"), "utf8")).resolves.toBe(stored);
});

test("flushes pending changes before locking", async (): Promise<void> => {
	const diary = new DiaryService();
	await diary.create(password);
	diary.save({
		entry: { dateUpdated: "now", text: "saved", title: "Saved" },
		indexDate: "2026/09/03",
	});
	await diary.lock();
	await expect(diary.flush()).resolves.toBeUndefined();

	const reopened = new DiaryService();
	await expect(reopened.read(password)).resolves.toMatchObject({
		entries: { "2026/09/03": { text: "saved", title: "Saved" } },
	});
});

test("failed replacement leaves the previous session and disk intact", async () => {
	const diary = new DiaryService();
	await diary.create(password);
	await diary.save({
		indexDate: "2026-09-17",
		entry: { title: "old", text: "saved", dateUpdated: "now" },
	});
	const rename = jest.spyOn(fs, "rename").mockRejectedValueOnce(Error("disk failure"));
	await expect(diary.replaceEntries({})).rejects.toThrow("disk failure");
	rename.mockRestore();
	await diary.lock();
	expect((await diary.read(password)).entries["2026-09-17"].text).toBe("saved");
});

test("encrypted recovery rejects wrong passwords and restores valid snapshots", async () => {
	const diary = new DiaryService();
	await diary.create(password);
	await diary.save({
		indexDate: "2026-09-17",
		entry: { title: "private", text: "secret", dateUpdated: "now" },
	});
	await diary.replaceEntries({});
	const snapshot = (await diary.listBackups())[0];
	expect(await readFile(path.join(directory, ".dayleaf-backups", snapshot), "utf8")).not.toContain(
		"secret",
	);
	await expect(diary.restoreBackup(snapshot, "wrong")).rejects.toThrow();
	expect((await diary.restoreBackup(snapshot, password)).entries["2026-09-17"].text).toBe("secret");
});

test("moves a diary without overwriting an existing destination", async () => {
	const diary = new DiaryService();
	await diary.create(password);
	const target = path.join(directory, "moved");
	await mkdir(target);
	await diary.moveTo(target);
	expect(await new DiaryService(target).fileExists()).toBe(true);
	await expect(diary.moveTo(target)).rejects.toThrow("already exists");
});

test("moves A to B and back while reusing identical encrypted backups", async () => {
	const target = await mkdtemp(path.join(os.tmpdir(), "dayleaf-return-"));
	try {
		const diary = new DiaryService(directory);
		await diary.create(password);
		await diary.save({
			indexDate: "2026-10-22",
			entry: { title: "标题", text: "正文", dateUpdated: "now" },
		});
		await diary.moveTo(target);
		await diary.moveTo(directory);
		expect(diary.getDirectory()).toBe(directory);
		await expect(new DiaryService(directory).read(password)).resolves.toMatchObject({
			entries: { "2026-10-22": { text: "正文" } },
		});
		await expect(fs.access(path.join(target, "mini-diary.txt"))).rejects.toMatchObject({
			code: "ENOENT",
		});
	} finally {
		await rm(target, { recursive: true, force: true });
	}
});

test("preserves different backups with matching names during migration", async () => {
	const target = await mkdtemp(path.join(os.tmpdir(), "dayleaf-collision-"));
	try {
		const diary = new DiaryService(directory);
		await diary.create(password);
		await diary.backup();
		const [name] = await diary.listBackups();
		await mkdir(path.join(target, ".dayleaf-backups"));
		await fs.writeFile(path.join(target, ".dayleaf-backups", name), "existing backup");
		await diary.moveTo(target);
		const names = await diary.listBackups();
		expect(names.length).toBeGreaterThan(1);
		expect(await readFile(path.join(target, ".dayleaf-backups", name), "utf8")).toBe(
			"existing backup",
		);
	} finally {
		await rm(target, { recursive: true, force: true });
	}
});

test("failed migration removes its own new files and can be retried", async () => {
	const target = await mkdtemp(path.join(os.tmpdir(), "dayleaf-retry-"));
	const originalCopy = fs.copyFile.bind(fs);
	try {
		const diary = new DiaryService(directory);
		await diary.create(password);
		await diary.backup();
		await diary.backup();
		let copies = 0;
		const spy = jest.spyOn(fs, "copyFile").mockImplementation(async (...args) => {
			copies += 1;
			if (copies === 3) throw Object.assign(Error("copy failed"), { code: "EIO" });
			return originalCopy(...args);
		});
		await expect(diary.moveTo(target)).rejects.toThrow("copy failed");
		spy.mockRestore();
		expect(await diary.fileExists()).toBe(true);
		expect(await fs.readdir(path.join(target, ".dayleaf-backups"))).toEqual([]);
		await diary.moveTo(target);
		expect(await diary.fileExists()).toBe(true);
	} finally {
		jest.restoreAllMocks();
		await rm(target, { recursive: true, force: true });
	}
});

test("legacy date keys and same-day article IDs survive encrypted saves and reopening", async () => {
	const diary = new DiaryService(directory);
	await diary.create(password);
	await diary.save({
		indexDate: "2026-10-23",
		entry: { title: "Legacy", text: "Old text", dateUpdated: "2026-10-23T01:00:00Z" },
	});
	await diary.save({
		indexDate: "independent-article",
		entry: {
			date: "2026-10-23",
			dateCreated: "2026-10-23T02:00:00Z",
			dateUpdated: "2026-10-23T02:00:00Z",
			title: "Second",
			text: "New text",
		},
	});
	const reopened = new DiaryService(directory);
	const { entries } = await reopened.read(password);
	expect(Object.keys(entries)).toHaveLength(2);
	expect(entries["2026-10-23"]).toMatchObject({ date: "2026-10-23", text: "Old text" });
	expect(entries["2026-10-23"].dateCreated).toBeUndefined();
	expect(entries["independent-article"].text).toBe("New text");
});
