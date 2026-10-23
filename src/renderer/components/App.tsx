import SettingsIcon from "feather-icons/dist/icons/settings.svg";
import React, { Component, lazy, ReactNode, Suspense } from "react";

import { OverlayType } from "../../shared/types";
import { toggleWindowSize } from "../electron/window";
import { Status, Theme, ThemePref } from "../types";
import { translations } from "../utils/i18n";
import { iconProps } from "../utils/icons";
import Diary from "./pages/diary/Diary";
import PasswordCreationContainer from "./pages/start-page/password-creation/PasswordCreationContainer";
import PasswordPromptContainer from "./pages/start-page/password-prompt/PasswordPromptContainer";
import ThemeContext from "./ThemeContext";

const GoToDateOverlayContainer = lazy(
	() => import("./overlays/go-to-date-overlay/GoToDateOverlayContainer"),
);
const ImportOverlayContainer = lazy(
	() => import("./overlays/import-overlay/ImportOverlayContainer"),
);
const PrefOverlayContainer = lazy(() => import("./overlays/pref-overlay/PrefOverlayContainer"));
const StatsOverlayContainer = lazy(() => import("./overlays/stats-overlay/StatsOverlayContainer"));

export interface StateProps {
	exportErrorMsg: string;
	exportStatus: Status;
	fileExists: boolean;
	isUnlocked: boolean;
	importErrorMsg: string;
	importStatus: Status;
	overlay: OverlayType;
	theme: Theme;
	themePref: ThemePref;
}

export interface DispatchProps {
	testFileExists: () => Promise<void>;
	updateThemePref: (themePref: ThemePref) => void;
	openPreferences: () => void;
}

type Props = StateProps & DispatchProps;

interface State {
	isLoading: boolean;
}

export default class App extends Component<Props, State> {
	static createOverlayComp(overlay: OverlayType): ReactNode {
		switch (overlay) {
			case "none":
				return null;
			case "go-to-date":
				return <GoToDateOverlayContainer />;
			case "import":
				return <ImportOverlayContainer />;
			case "preferences":
				return <PrefOverlayContainer />;
			case "statistics":
				return <StatsOverlayContainer />;
			default:
				throw Error(`Cannot display overlay: Overlay type "${overlay}" does not exist`);
		}
	}

	static hideSpinningCursor(): void {
		document.body.style.cursor = "auto";
	}

	static showSpinningCursor(): void {
		document.body.style.cursor = "wait";
	}

	constructor(props: Props) {
		super(props);
		this.state = { isLoading: true };
	}

	componentDidMount(): void {
		const { testFileExists } = this.props;
		void Promise.resolve(testFileExists())
			.catch((error) =>
				window.miniDiary.dialogs.showError(translations["diary-file"], error.message),
			)
			.finally(() => this.setState({ isLoading: false }));
	}

	componentDidUpdate(prevProps: Props): void {
		const { exportErrorMsg, exportStatus, importErrorMsg, importStatus } = this.props;
		if (exportErrorMsg && exportErrorMsg !== prevProps.exportErrorMsg) {
			void window.miniDiary.dialogs.showError(
				translations["export-error-title"],
				`${translations["export-error-msg"]}: ${exportErrorMsg}`,
			);
		}
		if (importErrorMsg && importErrorMsg !== prevProps.importErrorMsg) {
			void window.miniDiary.dialogs.showError(
				translations["import-error-title"],
				`${translations["import-error-msg"]}: ${importErrorMsg}`,
			);
		}
		if (exportStatus !== prevProps.exportStatus) {
			if (exportStatus === "inProgress") App.showSpinningCursor();
			else App.hideSpinningCursor();
		}
		if (importStatus !== prevProps.importStatus) {
			if (importStatus === "inProgress") App.showSpinningCursor();
			else App.hideSpinningCursor();
		}
	}

	render(): ReactNode {
		const { fileExists, isUnlocked, overlay, theme, openPreferences } = this.props;
		const { isLoading } = this.state;
		const showDiaryChrome = !isLoading && fileExists && isUnlocked;
		let page;
		if (isLoading) page = <p>{`${translations.loading}…`}</p>;
		else if (!fileExists) page = <PasswordCreationContainer />;
		else if (!isUnlocked) page = <PasswordPromptContainer />;
		else page = <Diary />;

		return (
			<ThemeContext.Provider value={theme}>
				<div className={`theme-${theme}`}>
					<div className="app">
						<div className={`app-window ${showDiaryChrome ? "has-diary-chrome" : ""}`}>
							{showDiaryChrome && (
								<header className="app-titlebar" onDoubleClick={toggleWindowSize}>
									<div className="app-titlebar-actions">
										<button
											type="button"
											className="app-icon-button"
											aria-label={translations.preferences}
											title={translations.preferences}
											onClick={openPreferences}
										>
											<SettingsIcon {...iconProps} />
										</button>
									</div>
								</header>
							)}
							{page}
							<Suspense fallback={null}>{App.createOverlayComp(overlay)}</Suspense>
						</div>
					</div>
				</div>
			</ThemeContext.Provider>
		);
	}
}
