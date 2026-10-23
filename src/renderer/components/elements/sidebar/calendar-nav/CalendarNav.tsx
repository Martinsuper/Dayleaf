import PrevIcon from "feather-icons/dist/icons/chevron-left.svg";
import NextIcon from "feather-icons/dist/icons/chevron-right.svg";
import { Moment } from "moment-timezone";
import React, { ChangeEvent, ReactElement, useEffect, useRef, useState } from "react";

import { MAX_DATE, MIN_DATE } from "../../../../constants";
import { createDate, toMonthYear } from "../../../../utils/dateFormat";
import { translations } from "../../../../utils/i18n";
import { iconProps } from "../../../../utils/icons";

export interface StateProps {
	allowFutureEntries: boolean;
	dateSelected: Moment;
}

export interface DispatchProps {
	setDateSelected: (date: Moment) => void;
	setMonthSelectedNext: () => void;
	setMonthSelectedPrevious: () => void;
}

type Props = StateProps & DispatchProps;

export default function CalendarNav(props: Props): ReactElement {
	const {
		allowFutureEntries,
		dateSelected,
		setDateSelected,
		setMonthSelectedNext,
		setMonthSelectedPrevious,
	} = props;
	const [selectorOpen, setSelectorOpen] = useState(false);
	const selectorRef = useRef<HTMLDivElement>(null);
	const today = createDate();
	const maximumDate = allowFutureEntries ? MAX_DATE : today;
	const years = Array.from(
		{ length: maximumDate.year() - MIN_DATE.year() + 1 },
		(_, index) => maximumDate.year() - index,
	);

	useEffect(() => {
		const onEscape = (event: KeyboardEvent): void => {
			if (event.key === "Escape") {
				setSelectorOpen(false);
				selectorRef.current?.querySelector("button")?.focus();
			}
		};
		const closeSelector = (event: MouseEvent): void => {
			if (!selectorRef.current?.contains(event.target as Node)) setSelectorOpen(false);
		};
		document.addEventListener("mousedown", closeSelector);
		document.addEventListener("keydown", onEscape);
		return () => {
			document.removeEventListener("mousedown", closeSelector);
			document.removeEventListener("keydown", onEscape);
		};
	}, []);

	const selectMonth = (year: number, month: number): void => {
		const day = dateSelected.date();
		const selectedMonth = dateSelected.clone().date(1).year(year).month(month);
		selectedMonth.date(Math.min(day, selectedMonth.daysInMonth()));
		setDateSelected(selectedMonth);
	};
	const onYearSelection = (event: ChangeEvent<HTMLSelectElement>): void => {
		const year = Number(event.target.value);
		const latestMonth = year === maximumDate.year() ? maximumDate.month() : 11;
		selectMonth(year, Math.min(dateSelected.month(), latestMonth));
	};
	const onMonthSelection = (event: ChangeEvent<HTMLSelectElement>): void => {
		selectMonth(dateSelected.year(), Number(event.target.value));
		setSelectorOpen(false);
	};

	// Check if buttons for switching to previous/next month should be enabled. Determined based on
	// the min/max dates and whether future diary entries are allowed
	const canClickPrev = dateSelected.isAfter(MIN_DATE, "month");
	const canClickNext =
		dateSelected.isBefore(MAX_DATE, "month") &&
		(allowFutureEntries || dateSelected.isBefore(today, "month"));
	const latestMonth = dateSelected.year() === maximumDate.year() ? maximumDate.month() : 11;

	return (
		<div className="calendar-nav">
			<div className="calendar-nav-row">
				<button
					type="button"
					className="button button-invisible"
					disabled={!canClickPrev}
					aria-label={translations["previous-month"]}
					title={translations["previous-month"]}
					onClick={setMonthSelectedPrevious}
				>
					<PrevIcon {...iconProps} />
				</button>
				<div className="month-selector-wrapper" ref={selectorRef}>
					<button
						type="button"
						className="month-selector"
						aria-expanded={selectorOpen}
						onClick={() => setSelectorOpen(!selectorOpen)}
					>
						{toMonthYear(dateSelected)}
					</button>
					{selectorOpen && (
						<div className="month-selector-popover">
							<select
								aria-label={translations["year-label"]}
								value={dateSelected.year()}
								onChange={onYearSelection}
							>
								{years.map((year) => (
									<option key={year} value={year}>
										{year}
									</option>
								))}
							</select>
							<select
								aria-label={translations["month-label"]}
								value={dateSelected.month()}
								onChange={onMonthSelection}
							>
								{Array.from({ length: latestMonth + 1 }, (_, month) => (
									<option key={month} value={month}>
										{dateSelected.clone().month(month).format("MMMM")}
									</option>
								))}
							</select>
						</div>
					)}
				</div>
				<button
					type="button"
					className="button button-invisible"
					disabled={!canClickNext}
					aria-label={translations["next-month"]}
					title={translations["next-month"]}
					onClick={setMonthSelectedNext}
				>
					<NextIcon {...iconProps} />
				</button>
			</div>
		</div>
	);
}
