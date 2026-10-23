import { createDate } from "../../utils/dateFormat";
import {
	DiaryAction,
	DiaryState,
	SET_DATE_SELECTED,
	SET_ENTRY_SELECTED,
	SET_SEARCH_KEY,
	SET_SEARCH_RESULTS,
} from "./types";

const today = createDate();

const initialState: DiaryState = {
	dateSelected: today,
	entrySelectedByDate: {},
	searchKey: "",
	searchResults: [],
};

function diaryReducer(state = initialState, action: DiaryAction): DiaryState {
	switch (action.type) {
		case "CLEAR_FILE_STATE":
			return { ...initialState, dateSelected: state.dateSelected };
		case SET_ENTRY_SELECTED:
			return {
				...state,
				entrySelectedByDate: {
					...state.entrySelectedByDate,
					[action.payload.date]: action.payload.id,
				},
			};
		case SET_DATE_SELECTED: {
			return {
				...state,
				dateSelected: action.payload.dateSelected,
			};
		}
		case SET_SEARCH_KEY: {
			return {
				...state,
				searchKey: action.payload.searchKey,
			};
		}
		case SET_SEARCH_RESULTS: {
			return {
				...state,
				searchResults: action.payload.searchResults,
			};
		}
		default:
			return state;
	}
}

export default diaryReducer;
