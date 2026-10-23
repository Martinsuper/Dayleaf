import React, { ReactElement, useRef, useState } from "react";
import { lang, translations } from "../../../utils/i18n";
import OverlayContainer from "../overlay-hoc/OverlayContainer";
import EntriesPref from "./entries-pref/EntriesPref";
import FileDirPrefContainer from "./file-dir-pref/FileDirPrefContainer";
import FirstDayOfWeekPrefContainer from "./first-day-of-week-pref/FirstDayOfWeekPrefContainer";
import PasswordPrefContainer from "./password-pref/PasswordPrefContainer";
import ThemePrefContainer from "./theme-pref/ThemePrefContainer";
import BackupRecovery from "./file-dir-pref/BackupRecovery";

export interface StateProps {
	isUnlocked: boolean;
}
export default function PrefOverlay({ isUnlocked }: StateProps): ReactElement {
	const zh = lang.startsWith("zh");
	const tabs = [
		["appearance", translations.appearance],
		...(isUnlocked ? [["editing", translations.edit]] : []),
		["data", zh ? "数据" : "Data"],
		...(isUnlocked ? [["security", zh ? "安全" : "Security"]] : []),
	];
	const [active, setActive] = useState("appearance");
	const tablist = useRef<HTMLDivElement>(null);
	return (
		<OverlayContainer className="pref-overlay">
			<header className="pref-header">
				<h1>{translations.preferences}</h1>
				<div
					className="pref-tabs"
					role="tablist"
					aria-label={translations.preferences}
					ref={tablist}
				>
					{tabs.map(([id, label], index) => (
						<button
							key={id}
							id={`pref-tab-${id}`}
							type="button"
							role="tab"
							aria-selected={active === id}
							aria-controls={`pref-${id}`}
							tabIndex={active === id ? 0 : -1}
							className={`button button-invisible ${active === id ? "button-active" : ""}`}
							onClick={() => setActive(id)}
							onKeyDown={(event) => {
								let next = index;
								if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
								else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
								else if (event.key === "Home") next = 0;
								else if (event.key === "End") next = tabs.length - 1;
								else return;
								event.preventDefault();
								setActive(tabs[next][0]);
								tablist.current?.querySelectorAll<HTMLButtonElement>("button")[next].focus();
							}}
						>
							{label}
						</button>
					))}
				</div>
			</header>
			<form className="preferences-form" onSubmit={(event) => event.preventDefault()} key={active}>
				{tabs.map(([id]) => (
					<section
						key={id}
						id={`pref-${id}`}
						role="tabpanel"
						aria-labelledby={`pref-tab-${id}`}
						hidden={active !== id}
						tabIndex={0}
					>
						{id === "appearance" && active === id && <ThemePrefContainer />}
						{id === "editing" && active === id && isUnlocked && (
							<>
								<FirstDayOfWeekPrefContainer />
								<EntriesPref />
							</>
						)}
						{id === "data" && active === id && (
							<>
								<FileDirPrefContainer />
								<BackupRecovery />
							</>
						)}
						{id === "security" && active === id && isUnlocked && <PasswordPrefContainer />}
					</section>
				))}
			</form>
		</OverlayContainer>
	);
}
