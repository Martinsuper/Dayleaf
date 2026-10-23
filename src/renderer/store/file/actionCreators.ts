import { flushPersistence, persist, settleDraft } from "../../utils/persistence";
import { entryDate as getEntryDate } from "../../utils/entries";
import { setEntrySelected } from "../diary/actionCreators";
import mergeEntries from "../../files/import/mergeEntries";
import { Entries, EntryId, IndexDate } from "../../types";
import { createDate, toIndexDate } from "../../utils/dateFormat";
import {
	addIndexDoc,
	cancelIndexUpdate,
	cancelIndexUpdates,
	createIndex,
	clearIndex,
	flushIndexUpdates,
	removeIndexDoc,
	scheduleIndexUpdate,
} from "../../utils/searchIndex";
import { disableMenuItems, enableMenuItems } from "../../electron/ipcRenderer/senders";
import { ThunkActionT } from "../store";
import {
	CLEAR_FILE_STATE,
	ClearFileStateAction,
	DECRYPT_ERROR,
	DECRYPT_IN_PROGRESS,
	DECRYPT_SUCCESS,
	ENCRYPT_ERROR,
	ENCRYPT_IN_PROGRESS,
	ENCRYPT_SUCCESS,
	SET_ENTRIES,
	SET_FILE_EXISTS,
	SetDecryptErrorAction,
	SetDecryptInProgressAction,
	SetDecryptSuccessAction,
	SetEncryptErrorAction,
	SetEncryptInProgressAction,
	SetEncryptSuccessAction,
	SetEntriesAction,
	SetFileExistsAction,
} from "./types";

function clearFileState(): ClearFileStateAction {
	return { type: CLEAR_FILE_STATE };
}

function setDecryptInProgress(): SetDecryptInProgressAction {
	return { type: DECRYPT_IN_PROGRESS };
}

function setDecryptError(decryptErrorMsg: string): SetDecryptErrorAction {
	return { type: DECRYPT_ERROR, payload: { decryptErrorMsg } };
}

function setDecryptSuccess(entries: Entries): SetDecryptSuccessAction {
	return { type: DECRYPT_SUCCESS, payload: { entries } };
}

function setEncryptInProgress(): SetEncryptInProgressAction {
	return { type: ENCRYPT_IN_PROGRESS };
}

function setEncryptError(encryptErrorMsg: string): SetEncryptErrorAction {
	return { type: ENCRYPT_ERROR, payload: { encryptErrorMsg } };
}

function setEncryptSuccess(entries: Entries): SetEncryptSuccessAction {
	return { type: ENCRYPT_SUCCESS, payload: { entries } };
}

function setEntries(entries: Entries): SetEntriesAction {
	return { type: SET_ENTRIES, payload: { entries } };
}

function setFileExists(fileExists: boolean): SetFileExistsAction {
	return { type: SET_FILE_EXISTS, payload: { fileExists } };
}

export const testFileExists =
	(): ThunkActionT =>
	async (dispatch): Promise<void> => {
		dispatch(setFileExists(await window.miniDiary.diary.fileExists()));
	};

export const lock =
	(): ThunkActionT =>
	async (dispatch): Promise<void> => {
		try {
			await flushPersistence();
			flushIndexUpdates();
			await window.miniDiary.diary.lock();
		} catch (error) {
			await window.miniDiary.dialogs.showError("Save failed", error.message);
			return;
		}
		await clearIndex();
		dispatch(clearFileState());
		disableMenuItems();
	};

export const decryptFile =
	(password: string): ThunkActionT =>
	async (dispatch): Promise<void> => {
		dispatch(setDecryptInProgress());
		try {
			const { entries } = await window.miniDiary.diary.read(password);
			dispatch(setDecryptSuccess(entries));
			await createIndex(entries);
			enableMenuItems();
		} catch (error) {
			console.error("Error decrypting diary file: ", error);
			dispatch(setDecryptError(error.message));
		}
	};

export const createEncryptedFile =
	(password: string): ThunkActionT =>
	async (dispatch): Promise<void> => {
		dispatch(setEncryptInProgress());
		try {
			const { entries } = await window.miniDiary.diary.create(password);
			dispatch(setEncryptSuccess(entries));
			await createIndex(entries);
			enableMenuItems();
		} catch (error) {
			console.error("Error creating encrypted diary file: ", error);
			dispatch(setEncryptError(error.message));
		}
	};

function saveEntry(entryId: EntryId, entry: Entries[EntryId] | null): ThunkActionT {
	return (): void => {
		persist(entryId, () => window.miniDiary.diary.save({ entry, indexDate: entryId }));
	};
}

function replaceEntries(entries: Entries): ThunkActionT {
	return async (dispatch): Promise<void> => {
		dispatch(setEncryptInProgress());
		try {
			await window.miniDiary.diary.replaceEntries(entries);
			dispatch(setEncryptSuccess(entries));
		} catch (error) {
			console.error("Error updating diary file: ", error);
			dispatch(setEncryptError(error.message));
			throw error;
		}
	};
}

export const resetDiary =
	(): ThunkActionT =>
	async (dispatch): Promise<void> => {
		await flushPersistence();
		await window.miniDiary.diary.reset();
		await clearIndex();
		dispatch(clearFileState());
		dispatch(setFileExists(false));
		disableMenuItems();
	};

export const updatePassword =
	(newPassword: string): ThunkActionT =>
	async (dispatch, getState): Promise<void> => {
		dispatch(setEncryptInProgress());
		try {
			await flushPersistence();
			const { entries } = await window.miniDiary.diary.updatePassword(
				newPassword,
				getState().file.entries,
			);
			dispatch(setEncryptSuccess(entries));
		} catch (error) {
			dispatch(setEncryptError(error.message));
			throw error;
		}
	};

export const updateEntry =
	(entryId: EntryId, title: string, text: string, date: IndexDate): ThunkActionT =>
	(dispatch, getState): void => {
		const { entries, isUnlocked } = getState().file;
		if (!isUnlocked) return;

		const updated = { ...entries };
		if (!title && !text) {
			if (updated[entryId]) {
				cancelIndexUpdate(entryId);
				void removeIndexDoc(entryId);
				delete updated[entryId];
			}
		} else if (!updated[entryId]) {
			const entry = {
				date,
				dateCreated: createDate().toISOString(),
				dateUpdated: createDate().toString(),
				title,
				text,
				textFormat: "markdown" as const,
				textFormatVersion: 1,
			};
			updated[entryId] = entry;
			void addIndexDoc(entryId, entry);
		} else if (title !== updated[entryId].title || text !== updated[entryId].text) {
			const oldEntry = updated[entryId];
			const entry = {
				...oldEntry,
				date,
				dateUpdated: createDate().toString(),
				title,
				text,
				textFormat: "markdown" as const,
				textFormatVersion: 1,
			};
			updated[entryId] = entry;
			scheduleIndexUpdate(entryId, oldEntry, entry);
		} else {
			settleDraft();
			return;
		}
		dispatch(setEntries(updated));
		dispatch(saveEntry(entryId, updated[entryId] || null));
	};

export const mergeUpdateFile =
	(newEntries: Entries): ThunkActionT =>
	async (dispatch, getState): Promise<void> => {
		await flushPersistence();
		const existing = getState().file.entries;
		const conflicts = Object.keys(newEntries).filter((date) => Boolean(existing[date]));
		const choice = conflicts.length
			? await window.miniDiary.dialogs.importConflict(
					conflicts.map(
						(id) =>
							`${getEntryDate(id, newEntries[id])} · ${
								newEntries[id].title || newEntries[id].text.slice(0, 40)
							}`,
					),
					Object.keys(newEntries).length - conflicts.length,
			  )
			: "replace";
		if (choice === "cancel") throw Error("Import cancelled");
		const entries = { ...existing };
		Object.entries(newEntries).forEach(([date, entry]) => {
			if (existing[date] && choice === "skip") return;
			entries[date] =
				existing[date] && choice === "merge" ? mergeEntries(existing[date], entry) : entry;
		});
		await dispatch(replaceEntries(entries));
		cancelIndexUpdates();
		await createIndex(entries);
		const day = toIndexDate(getState().diary.dateSelected);
		const imported = Object.entries(newEntries).filter(
			([id, entry]) =>
				getEntryDate(id, entry) === day && entries[id] && !(existing[id] && choice === "skip"),
		);
		if (imported.length) dispatch(setEntrySelected(day, imported[imported.length - 1][0]));
	};
