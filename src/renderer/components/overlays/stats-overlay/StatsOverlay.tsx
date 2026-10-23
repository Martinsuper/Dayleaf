import React, { PureComponent, ReactNode } from "react";
import { calculateDiaryStats } from "../../../utils/diaryStats";

import { getLang } from "../../../electron/ipcRenderer/senders";
import { Entries } from "../../../types";
import { lang, translations } from "../../../utils/i18n";
import OverlayContainer from "../overlay-hoc/OverlayContainer";

const locale = getLang();

export interface StateProps {
	entries: Entries;
}

type Props = StateProps;

interface Stats {
	nrEntries: number;
	nrDays: number;
	avgEntriesPerWeek: number;
	longestStreak: number;
	currentStreak: number;
	nrWords: number;
	avgWordsPerEntry: number;
}

export default class StatsOverlay extends PureComponent<Props, {}> {
	/**
	 * Return a string representation of the provided number, with thousands separators and at most
	 * one digit after the decimal point
	 */
	static formatNum(num: number): string {
		return num.toLocaleString(locale, { maximumFractionDigits: 1 });
	}

	/**
	 * Calculate various stats about the diary file's content
	 */
	static calcStats(entries: Entries): Stats {
		return calculateDiaryStats(entries);
	}

	render(): ReactNode {
		const { entries } = this.props;

		const stats = StatsOverlay.calcStats(entries);

		return (
			<OverlayContainer className="stats-overlay">
				<h1>{translations.statistics}</h1>
				<table>
					<tbody>
						<tr>
							<td className="stat-number">{StatsOverlay.formatNum(stats.nrDays)}</td>
							<td className="stat-label">
								{lang.startsWith("zh") ? "记录天数" : "Days with entries"}
							</td>
						</tr>
						<tr>
							<td className="stat-number">{StatsOverlay.formatNum(stats.nrEntries)}</td>
							<td className="stat-label">{translations["total-entries"]}</td>
						</tr>
						<tr>
							<td className="stat-number">{StatsOverlay.formatNum(stats.avgEntriesPerWeek)}</td>
							<td className="stat-label">{translations["entries-per-week"]}</td>
						</tr>
						<tr>
							<td className="stat-number">{StatsOverlay.formatNum(stats.longestStreak)}</td>
							<td className="stat-label">{translations["streak-best"]}</td>
						</tr>
						<tr>
							<td className="stat-number">{StatsOverlay.formatNum(stats.currentStreak)}</td>
							<td className="stat-label">{translations["streak-current"]}</td>
						</tr>
						<tr>
							<td className="stat-number">{StatsOverlay.formatNum(stats.nrWords)}</td>
							<td className="stat-label">{translations["total-words"]}</td>
						</tr>
						<tr>
							<td className="stat-number">{StatsOverlay.formatNum(stats.avgWordsPerEntry)}</td>
							<td className="stat-label">{translations["words-per-entry"]}</td>
						</tr>
					</tbody>
				</table>
			</OverlayContainer>
		);
	}
}
