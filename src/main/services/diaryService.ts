import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { constants } from "fs";

import { app } from "electron";

import { DiaryEntryUpdate, DiaryPayload } from "../../shared/ipc";
import { Entries, Metadata, MiniDiaryJson } from "../../renderer/types";

// Keep the legacy filename and format identifier so existing diaries remain compatible.
const FILE_NAME = "mini-diary.txt";
const FORMAT = "mini-diary/v2";

interface EncryptedDiary {
	ciphertext: string;
	format: typeof FORMAT;
	nonce: string;
	salt: string;
	tag: string;
}

interface Session {
	entries: Entries;
	key: Buffer;
	metadata: Metadata;
	salt: Buffer;
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
	return new Promise((resolve, reject): void => {
		crypto.scrypt(password, salt, 32, (error, key): void => {
			if (error) {
				reject(error);
				return;
			}
			resolve(key as Buffer);
		});
	});
}

function isEncryptedDiary(value: unknown): value is EncryptedDiary {
	if (!value || typeof value !== "object") return false;
	const data = value as Record<string, unknown>;
	return (
		data.format === FORMAT &&
		["ciphertext", "nonce", "salt", "tag"].every((key) => typeof data[key] === "string")
	);
}

function isDiaryPayload(value: unknown): value is MiniDiaryJson {
	if (!value || typeof value !== "object") return false;
	const data = value as Record<string, unknown>;
	return Boolean(
		data.entries &&
			data.metadata &&
			typeof data.entries === "object" &&
			typeof data.metadata === "object",
	);
}

export default class DiaryService {
	private directory: string;

	private session: Session | null = null;

	private writePromise: Promise<void> = Promise.resolve();

	private writeQueued = false;

	private writing = false;

	private lastBackup = 0;

	constructor(directory = app.getPath("userData")) {
		this.directory = path.resolve(directory);
	}

	getDirectory(): string {
		return this.directory;
	}

	async setDirectory(directory: string): Promise<void> {
		await this.lock();
		await fs.access(directory, constants.R_OK);
		await fs.access(directory, constants.W_OK);
		this.directory = path.resolve(directory);
	}

	async moveTo(directory: string): Promise<void> {
		await this.flush();
		await this.backup();
		const destination = path.resolve(directory, FILE_NAME);
		try {
			await fs.access(destination);
			throw Error("A diary file already exists in the selected directory");
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
		}
		// Exclusive copy also works across volumes and never replaces another diary.
		await fs.copyFile(this.filePath(), destination, constants.COPYFILE_EXCL);
		const createdBackups: string[] = [];
		try {
			await fs.chmod(destination, 0o600);
			const original = await fs.readFile(this.filePath());
			if (!(await fs.readFile(destination)).equals(original))
				throw Error("Diary copy verification failed");
			const backupDirectory = path.join(directory, ".dayleaf-backups");
			await fs.mkdir(backupDirectory, { recursive: true, mode: 0o700 });
			for (const name of await this.listBackups()) {
				const source = path.join(this.directory, ".dayleaf-backups", name);
				const content = await fs.readFile(source);
				let target = path.join(backupDirectory, name);
				let backupReady = false;
				while (!backupReady) {
					try {
						await fs.copyFile(source, target, constants.COPYFILE_EXCL);
						createdBackups.push(target);
						await fs.chmod(target, 0o600);
						if (!(await fs.readFile(target)).equals(content))
							throw Error("Backup copy verification failed");
						backupReady = true;
					} catch (error) {
						if (error.code !== "EEXIST") throw error;
						if ((await fs.readFile(target)).equals(content)) {
							backupReady = true;
						} else {
							target = path.join(
								backupDirectory,
								`${name.split("-")[0]}-${crypto.randomBytes(8).toString("hex")}.txt`,
							);
						}
					}
				}
			}
			await fs.unlink(this.filePath());
		} catch (error) {
			await Promise.all(
				[destination, ...createdBackups].map((file) => fs.rm(file, { force: true })),
			);
			throw error;
		}
		this.directory = directory;
	}

	async fileExists(): Promise<boolean> {
		try {
			await fs.access(this.filePath());
			return true;
		} catch (error) {
			if (error.code === "ENOENT") return false;
			throw error;
		}
	}

	async create(password: string): Promise<DiaryPayload> {
		if (await this.fileExists()) throw Error("A diary already exists in this directory");
		const salt = crypto.randomBytes(16);
		const metadata = this.metadata();
		const entries = {};
		this.session = { entries, key: await deriveKey(password, salt), metadata, salt };
		await this.write();
		return { entries, metadata };
	}

	async read(password: string): Promise<DiaryPayload> {
		const serialized = await fs.readFile(this.filePath(), "utf8");
		const encrypted = JSON.parse(serialized) as unknown;
		if (!isEncryptedDiary(encrypted)) throw Error("Unsupported diary file format");
		const salt = Buffer.from(encrypted.salt, "base64");
		const key = await deriveKey(password, salt);
		const decipher = crypto.createDecipheriv(
			"aes-256-gcm",
			key,
			Buffer.from(encrypted.nonce, "base64"),
		);
		decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
		const plaintext = Buffer.concat([
			decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
			decipher.final(),
		]);
		const payload = JSON.parse(plaintext.toString("utf8")) as unknown;
		if (!isDiaryPayload(payload)) throw Error("Diary file has an invalid payload");
		Object.entries(payload.entries).forEach(([id, entry]) => {
			if (!entry.date && /^\d{4}-\d{2}-\d{2}$/.test(id))
				payload.entries[id] = { ...entry, date: id };
		});
		this.session = { entries: payload.entries, key, metadata: payload.metadata, salt };
		return payload;
	}

	async save(update: DiaryEntryUpdate): Promise<void> {
		const session = this.requireSession();
		if (update.entry) session.entries[update.indexDate] = update.entry;
		else delete session.entries[update.indexDate];
		this.queueWrite();
		await this.writePromise;
	}

	async replaceEntries(entries: Entries): Promise<void> {
		await this.flush();
		const session = this.requireSession();
		await this.backup();
		const next = { ...session, entries };
		await this.write(next);
		this.session = next;
	}

	async updatePassword(password: string, entries: Entries): Promise<DiaryPayload> {
		await this.flush();
		const previous = this.requireSession();
		const { metadata } = previous;
		await this.backup();
		const salt = crypto.randomBytes(16);
		const next = { entries, key: await deriveKey(password, salt), metadata, salt };
		try {
			await this.write(next);
		} catch (error) {
			next.key.fill(0);
			throw error;
		}
		previous.key.fill(0);
		this.session = next;
		return { entries, metadata: next.metadata };
	}

	async flush(): Promise<void> {
		await this.writePromise;
	}

	async lock(): Promise<void> {
		await this.flush();
		this.lockSession();
	}

	async reset(): Promise<void> {
		await this.backup();
		await this.lock();
		await fs.unlink(this.filePath());
	}

	/** Keep bounded encrypted recovery snapshots, including before destructive operations. */
	async backup(): Promise<void> {
		if (!(await this.fileExists())) return;
		const directory = path.join(this.directory, ".dayleaf-backups");
		await fs.mkdir(directory, { recursive: true, mode: 0o700 });
		const existing = (await fs.readdir(directory)).filter((file) =>
			/^\d+-[a-f0-9]+\.txt$/.test(file),
		);
		const latestTimestamp = existing.reduce(
			(latest, file) => Math.max(latest, Number(file.split("-", 1)[0])),
			0,
		);
		const timestamp = Math.max(Date.now(), latestTimestamp + 1);
		const name = `${timestamp}-${crypto.randomBytes(4).toString("hex")}.txt`;
		await fs.copyFile(this.filePath(), path.join(directory, name), constants.COPYFILE_EXCL);
		await fs.chmod(path.join(directory, name), 0o600);
		const files = [...existing, name].sort().reverse();
		await Promise.all(files.slice(10).map((file) => fs.unlink(path.join(directory, file))));
		this.lastBackup = timestamp;
	}

	/** Return only snapshots owned by the current diary directory. */
	async listBackups(): Promise<string[]> {
		try {
			return (await fs.readdir(path.join(this.directory, ".dayleaf-backups")))
				.filter((file) => /^\d+-[a-f0-9]+\.txt$/.test(file))
				.sort()
				.reverse();
		} catch (error) {
			if (error.code === "ENOENT") return [];
			throw error;
		}
	}

	/** Validate and decrypt a snapshot before atomically restoring it. */
	async restoreBackup(name: string, password: string): Promise<DiaryPayload> {
		if (!(await this.listBackups()).includes(name)) throw Error("Invalid backup");
		await this.flush();
		const serialized = await fs.readFile(
			path.join(this.directory, ".dayleaf-backups", name),
			"utf8",
		);
		const temporaryDirectory = await fs.mkdtemp(path.join(app.getPath("temp"), "dayleaf-restore-"));
		const candidate = new DiaryService(temporaryDirectory);
		try {
			await fs.writeFile(path.join(temporaryDirectory, FILE_NAME), serialized, { mode: 0o600 });
			const payload = await candidate.read(password);
			await this.backup();
			await this.write(candidate.requireSession());
			this.lockSession();
			this.session = candidate.session;
			candidate.session = null;
			return payload;
		} finally {
			candidate.lockSession();
			await fs.rm(temporaryDirectory, { recursive: true, force: true });
		}
	}

	private filePath(): string {
		return path.resolve(this.directory, FILE_NAME);
	}

	private metadata(): Metadata {
		return {
			application: app.name,
			dateUpdated: new Date().toISOString(),
			version: app.getVersion(),
		};
	}

	private requireSession(): Session {
		if (!this.session) throw Error("Diary is locked");
		return this.session;
	}

	private lockSession(): void {
		if (this.session) this.session.key.fill(0);
		this.session = null;
	}

	private queueWrite(): void {
		this.writeQueued = true;
		if (this.writing) return;
		this.writing = true;
		this.writePromise = this.writePromise
			.catch(() => undefined)
			.then(async (): Promise<void> => {
				while (this.writeQueued) {
					this.writeQueued = false;
					await this.write();
				}
			})
			.finally((): void => {
				this.writing = false;
			});
	}

	private async write(session = this.requireSession()): Promise<void> {
		if (Date.now() - this.lastBackup > 5 * 60_000) await this.backup();
		const payload = {
			entries: session.entries,
			metadata: { ...session.metadata, dateUpdated: new Date().toISOString() },
		};
		Object.assign(session, { metadata: payload.metadata });
		const nonce = crypto.randomBytes(12);
		const cipher = crypto.createCipheriv("aes-256-gcm", session.key, nonce);
		const ciphertext = Buffer.concat([
			cipher.update(JSON.stringify(payload), "utf8"),
			cipher.final(),
		]);
		const serialized = JSON.stringify({
			ciphertext: ciphertext.toString("base64"),
			format: FORMAT,
			nonce: nonce.toString("base64"),
			salt: session.salt.toString("base64"),
			tag: cipher.getAuthTag().toString("base64"),
		});
		const target = this.filePath();
		const temporary = `${target}.${process.pid}.${crypto.randomBytes(8).toString("hex")}.tmp`;
		await fs.mkdir(path.dirname(target), { recursive: true });
		try {
			const file = await fs.open(temporary, "wx", 0o600);
			try {
				await file.writeFile(serialized, "utf8");
				await file.sync();
			} finally {
				await file.close();
			}
			await fs.rename(temporary, target);
		} finally {
			await fs.rm(temporary, { force: true });
		}
	}
}
