import SearchIcon from "feather-icons/dist/icons/search.svg";
import ClearIcon from "feather-icons/dist/icons/x.svg";
import debounce from "lodash.debounce";
import React, { ChangeEvent, PureComponent, ReactNode } from "react";

import { translations } from "../../../../utils/i18n";
import { iconProps } from "../../../../utils/icons";

export interface StateProps {
	searchKey: string;
}

export interface DispatchProps {
	search: (searchKey: string) => void;
}

type Props = StateProps & DispatchProps;

interface State {
	newSearchKey: string;
}

export default class SearchBar extends PureComponent<Props, State> {
	updateSearchKeyDebounced: ReturnType<typeof debounce>;

	constructor(props: Props) {
		super(props);

		this.state = { newSearchKey: props.searchKey };
		this.onChange = this.onChange.bind(this);
		this.clearSearchKey = this.clearSearchKey.bind(this);
		this.updateSearchKey = this.updateSearchKey.bind(this);
		this.updateSearchKeyDebounced = debounce(this.updateSearchKey, 500);
	}

	componentWillUnmount(): void {
		this.updateSearchKeyDebounced.cancel();
	}

	onChange(e: ChangeEvent<HTMLInputElement>): void {
		const newSearchKey = e.target.value;
		this.setState({ newSearchKey });
		if (newSearchKey === "") this.updateSearchKey(newSearchKey);
		this.updateSearchKeyDebounced(newSearchKey);
	}

	clearSearchKey(): void {
		this.updateSearchKeyDebounced.cancel();
		this.setState({ newSearchKey: "" });
		this.updateSearchKey("");
	}

	updateSearchKey(newSearchKey: string): void {
		const { search } = this.props;
		search(newSearchKey);
	}

	render(): ReactNode {
		const { newSearchKey } = this.state;

		return (
			<div className="view-selector">
				<div className="search-input-wrapper">
					<SearchIcon className="search-input-icon" {...iconProps} />
					<input
						type="search"
						className="search-input"
						placeholder={translations["search-diary"]}
						aria-label={translations.search}
						spellCheck={false}
						value={newSearchKey}
						onChange={this.onChange}
					/>
					{newSearchKey !== "" && (
						<span className="search-input-clear">
							<button
								type="button"
								className="button button-invisible"
								aria-label={translations.clear}
								onClick={this.clearSearchKey}
							>
								<ClearIcon {...iconProps} title={translations.clear} />
							</button>
						</span>
					)}
				</div>
			</div>
		);
	}
}
