import React, { ReactElement } from "react";
import { countEntryWords } from "../../../../../utils/diaryStats";

import { Entries } from "../../../../../types";
import { lang, translate } from "../../../../../utils/i18n";

export interface StateProps {
	entryId: string;
	entries: Entries;
}

type Props = StateProps;

/**
 * Text component which indicates the number of words/characters (varies per language) for the
 * currently selected diary entry
 */
export default function WordCount(props: Props): ReactElement {
	const { entryId: indexDate, entries } = props;

	let wordCount = 0;

	if (indexDate in entries) {
		const entry = entries[indexDate];
		wordCount = countEntryWords(entry.title ?? "", entry.text ?? "");
	}

	return (
		<p className="word-count">
			{translate("word-count", { count: wordCount.toLocaleString(lang) })}
		</p>
	);
}
