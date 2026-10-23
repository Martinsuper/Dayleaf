import { Moment } from "moment-timezone";
import { connect } from "react-redux";

import { setDateSelected, setEntrySelected } from "../../../../store/diary/actionCreators";
import { SetDateSelectedAction } from "../../../../store/diary/types";
import { RootState, ThunkDispatchT } from "../../../../store/store";
import SearchResults, { DispatchProps, StateProps } from "./SearchResults";

const mapStateToProps = (state: RootState): StateProps => ({
	dateSelected: state.diary.dateSelected,
	entrySelectedByDate: state.diary.entrySelectedByDate,
	entries: state.file.entries,
	searchResults: state.diary.searchResults,
	searchKey: state.diary.searchKey,
});

const mapDispatchToProps = (dispatch: ThunkDispatchT): DispatchProps => ({
	selectEntry: (date: string, id: string): void => {
		dispatch(setEntrySelected(date, id));
	},
	setDateSelected: (date: Moment): SetDateSelectedAction => dispatch(setDateSelected(date)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchResults);
