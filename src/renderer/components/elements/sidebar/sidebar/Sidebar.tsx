import { IconCircleCheck, IconClock, IconLoader2, IconAlertCircle } from "@tabler/icons-react";
import React, { ReactElement, useState } from "react";
import { translations } from "../../../../utils/i18n";
import { retryPersistence, useSaveState } from "../../../../utils/persistence";
import CalendarContainer from "../calendar/CalendarContainer";
import SearchBarContainer from "../search-bar/SearchBarContainer";
import SearchResultsContainer from "../search-results/SearchResultsContainer";

export interface StateProps {
	searchKey: string;
}
export default function Sidebar({ searchKey }: StateProps): ReactElement {
	const state = useSaveState();
	const [calendarOpen, setCalendarOpen] = useState(false);
	const SaveIcon = {
		saved: IconCircleCheck,
		error: IconAlertCircle,
		saving: IconLoader2,
		dirty: IconClock,
	}[state];
	return (
		<div className="sidebar">
			<div className="app-brand sidebar-brand">
				<span>日笺</span>
				<small>Dayleaf</small>
			</div>
			<SearchBarContainer />
			{searchKey === "" ? (
				<>
					<button
						type="button"
						className="button calendar-toggle"
						aria-expanded={calendarOpen}
						aria-controls="sidebar-calendar"
						onClick={() => setCalendarOpen(!calendarOpen)}
					>
						{translations["calendar-toggle"]}
					</button>
					<div
						id="sidebar-calendar"
						className={`sidebar-calendar ${calendarOpen ? "is-open" : ""}`}
					>
						<CalendarContainer />
					</div>
				</>
			) : (
				<SearchResultsContainer />
			)}
			<footer className={`sidebar-save-state save-${state}`} role="status">
				<SaveIcon aria-hidden="true" className={state === "saving" ? "save-spinner" : undefined} />
				{state === "saved" ? translations["saved-automatically"] : translations[`save-${state}`]}
				{state === "error" && (
					<button
						type="button"
						className="button"
						onClick={() => {
							void retryPersistence().catch(() => undefined);
						}}
					>
						{translations["save-retry"]}
					</button>
				)}
			</footer>
		</div>
	);
}
