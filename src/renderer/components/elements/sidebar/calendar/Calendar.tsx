import { Moment } from "moment-timezone";
import React, { PureComponent, ReactNode } from "react";
import { DayPicker } from "react-day-picker";

import { calendarLocale, translations } from "../../../../utils/i18n";
import { Entries, Weekday } from "../../../../types";
import { createDate, parseDate } from "../../../../utils/dateFormat";
import CalendarNavContainer from "../calendar-nav/CalendarNavContainer";

export interface StateProps {
	allowFutureEntries: boolean;
	dateSelected: Moment;
	entries: Entries;
	firstDayOfWeek: Weekday | null;
}

export interface DispatchProps {
	setDateSelected: (date: Moment) => void;
}

type Props = StateProps & DispatchProps;

const classNames = {
	button_next: "DayPicker-NavButton DayPicker-NavButton--next",
	button_previous: "DayPicker-NavButton DayPicker-NavButton--prev",
	caption: "DayPicker-Caption",
	cell: "DayPicker-Day",
	day: "DayPicker-Day",
	day_button: "DayPicker-DayButton",
	disabled: "DayPicker-Day--disabled",
	head_cell: "DayPicker-Weekday",
	head_row: "DayPicker-WeekdaysRow",
	hidden: "DayPicker-Day--hidden",
	month: "DayPicker-Month",
	month_caption: "DayPicker-Caption",
	month_grid: "DayPicker-Body",
	months: "DayPicker-Months",
	outside: "DayPicker-Day--outside",
	root: "DayPicker",
	selected: "DayPicker-Day--selected",
	today: "DayPicker-Day--today",
	week: "DayPicker-Week",
	weeks: "DayPicker-Body",
	weekday: "DayPicker-Weekday",
	weekdays: "DayPicker-WeekdaysRow",
	weekdays_row: "DayPicker-WeekdaysRow",
};

export default class Calendar extends PureComponent<Props, {}> {
	onDateSelection = (date: Date | undefined): void => {
		if (!date) return;
		const { allowFutureEntries, setDateSelected } = this.props;
		const parsedDate = parseDate(date);
		if (allowFutureEntries || parsedDate.isSameOrBefore(createDate(), "day"))
			setDateSelected(parsedDate);
	};

	render(): ReactNode {
		const { allowFutureEntries, dateSelected, entries, firstDayOfWeek, setDateSelected } =
			this.props;
		const daysWithEntries = Object.keys(entries).map((indexDate) => parseDate(indexDate).toDate());
		return (
			<>
				<CalendarNavContainer />
				<DayPicker
					locale={calendarLocale}
					classNames={classNames}
					components={{ MonthCaption: () => <></> }}
					disabled={allowFutureEntries ? undefined : { after: createDate().toDate() }}
					hideNavigation
					mode="single"
					modifiers={{ hasEntry: daysWithEntries }}
					modifiersClassNames={{ hasEntry: "DayPicker-Day--hasEntry" }}
					month={dateSelected.toDate()}
					onSelect={this.onDateSelection}
					selected={dateSelected.toDate()}
					weekStartsOn={firstDayOfWeek ?? undefined}
				/>
				<button
					type="button"
					className="calendar-today-button"
					onClick={() => setDateSelected(createDate())}
				>
					{translations.today}
				</button>
			</>
		);
	}
}
