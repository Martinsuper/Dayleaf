import React, { ReactElement, useMemo } from "react";
import { connect } from "react-redux";
import { updateEntry } from "../../../../store/file/actionCreators";
import { setEntrySelected } from "../../../../store/diary/actionCreators";
import { RootState, ThunkDispatchT } from "../../../../store/store";
import { MarkdownEditorMode } from "../../../../types";
import { updateMarkdownEditorMode } from "../../../../store/app/actionCreators";
import { toIndexDate } from "../../../../utils/dateFormat";
import { entriesForDay } from "../../../../utils/entries";
import Editor, { DispatchProps, StateProps } from "./Editor";

const mapStateToProps = (state: RootState): StateProps => {
	const date = toIndexDate(state.diary.dateSelected);
	const selected = state.diary.entrySelectedByDate[date];
	const dayEntries = entriesForDay(state.file.entries, date);
	return {
		enableMarkdownShortcuts: state.app.enableMarkdownShortcuts,
		enableSpellcheck: state.app.enableSpellcheck,
		hideTitles: state.app.hideTitles,
		markdownEditorMode: state.app.markdownEditorMode,
		dateSelected: state.diary.dateSelected,
		entries: state.file.entries,
		entryId: selected || dayEntries[0]?.[0] || "",
	};
};
const mapDispatchToProps = (dispatch: ThunkDispatchT): DispatchProps => ({
	updateEntry: (id: string, title: string, text: string, date: string): void => {
		dispatch(updateEntry(id, title, text, date));
	},
	selectEntry: (date: string, id: string): void => {
		dispatch(setEntrySelected(date, id));
	},
	updateMarkdownEditorMode: (mode: MarkdownEditorMode): void => {
		dispatch(updateMarkdownEditorMode(mode));
	},
});
function SelectedEditor(props: StateProps & DispatchProps): ReactElement {
	const { dateSelected, entryId } = props;
	const date = toIndexDate(dateSelected);
	const draftId = useMemo(() => globalThis.crypto.randomUUID(), [date]);
	const id = entryId || draftId;
	return <Editor key={`${date}:${id}`} {...props} entryId={id} />;
}
export default connect(mapStateToProps, mapDispatchToProps)(SelectedEditor);
