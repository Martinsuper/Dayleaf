import { convertToMiniDiaryJson } from "../../files/export/json";
import { convertToMd } from "../../files/export/md";
import { convertToDayOneTxt } from "../../files/export/txt";
import { ExportFormat, Entries } from "../../types";
import { translations } from "../../utils/i18n";
import { flushPersistence } from "../../utils/persistence";
import { ThunkActionT } from "../store";
import {
	EXPORT_ERROR,
	EXPORT_IN_PROGRESS,
	EXPORT_SUCCESS,
	SetExportErrorAction,
	SetExportInProgressAction,
	SetExportSuccessAction,
} from "./types";

const fileExtensions: Record<ExportFormat, string> = {
	jsonMiniDiary: "json",
	md: "md",
	pdf: "pdf",
	txtDayOne: "txt",
};

function setExportInProgress(): SetExportInProgressAction {
	return { type: EXPORT_IN_PROGRESS };
}

function setExportError(exportErrorMsg: string): SetExportErrorAction {
	return { type: EXPORT_ERROR, payload: { exportErrorMsg } };
}

function setExportSuccess(): SetExportSuccessAction {
	return { type: EXPORT_SUCCESS };
}

const exportToFile =
	(
		converterFunc: (entries: Entries) => Promise<string>,
		exportFormat: Exclude<ExportFormat, "pdf">,
	): ThunkActionT =>
	async (dispatch, getState): Promise<void> => {
		dispatch(setExportInProgress());
		try {
			await flushPersistence();
			const content = await converterFunc(getState().file.entries);
			await window.miniDiary.dialogs.exportFile(
				`dayleaf-export.${fileExtensions[exportFormat]}`,
				translations.export,
				content,
			);
			dispatch(setExportSuccess());
		} catch (error) {
			console.error("Error exporting diary file: ", error);
			dispatch(setExportError(error.toString()));
		}
	};

export const exportToJsonMiniDiary =
	(): ThunkActionT =>
	(dispatch): void => {
		dispatch(exportToFile(convertToMiniDiaryJson, "jsonMiniDiary"));
	};

export const exportToMd =
	(): ThunkActionT =>
	(dispatch): void => {
		dispatch(exportToFile(convertToMd, "md"));
	};

export const exportToPdf =
	(): ThunkActionT =>
	async (dispatch, getState): Promise<void> => {
		dispatch(setExportInProgress());
		try {
			await flushPersistence();
			const markdown = await convertToMd(getState().file.entries, false);
			await window.miniDiary.dialogs.exportPdf(
				`dayleaf-export.${fileExtensions.pdf}`,
				translations.export,
				markdown,
			);
			dispatch(setExportSuccess());
		} catch (error) {
			console.error("Error exporting diary file: ", error);
			dispatch(setExportError(error.toString()));
		}
	};

export const exportToTxtDayOne =
	(): ThunkActionT =>
	(dispatch): void => {
		dispatch(exportToFile(convertToDayOneTxt, "txtDayOne"));
	};
