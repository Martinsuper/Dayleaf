import { connect } from "react-redux";

import { toIndexDate } from "../../../../../utils/dateFormat";
import { entriesForDay } from "../../../../../utils/entries";
import { RootState } from "../../../../../store/store";
import WordCount, { StateProps } from "./WordCount";

const mapStateToProps = (state: RootState): StateProps => ({
	entryId:
		state.diary.entrySelectedByDate[toIndexDate(state.diary.dateSelected)] ||
		entriesForDay(state.file.entries, toIndexDate(state.diary.dateSelected))[0]?.[0] ||
		"",
	entries: state.file.entries,
});

export default connect(mapStateToProps)(WordCount);
