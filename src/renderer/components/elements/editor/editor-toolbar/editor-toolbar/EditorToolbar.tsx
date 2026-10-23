import { IconEdit, IconMarkdown } from "@tabler/icons-react";
import React, { ReactElement } from "react";

import { MarkdownEditorMode } from "../../../../../types";
import { translations } from "../../../../../utils/i18n";
import { iconProps } from "../../../../../utils/icons";
import InsertImageButton from "./InsertImageButton";
import FormattingButtons from "../formatting-buttons/FormattingButtons";
import MarkdownHelp from "../markdown-help/MarkdownHelp";
import WordCountWrapper from "../word-count/WordCountWrapper";

interface Props {
	readOnly: boolean;
	markdown: string;
	mode: MarkdownEditorMode;
	onInsertMarkdown: (markdown: string) => void;
	onModeChange: (mode: MarkdownEditorMode) => void;
}

export default function EditorToolbar({
	readOnly,
	markdown,
	mode,
	onInsertMarkdown,
	onModeChange,
}: Props): ReactElement {
	return (
		<div className="editor-toolbar-shell">
			<div
				className="editor-toolbar"
				onMouseDown={(event): void => {
					if (
						(event.target as HTMLElement).closest("button") &&
						!(event.target as HTMLElement).closest(".link-dialog")
					)
						event.preventDefault();
				}}
				role="none"
			>
				{mode === "rich" && !readOnly ? (
					<FormattingButtons />
				) : (
					<div className="markdown-source-label">Markdown</div>
				)}
				<div className="editor-toolbar-end">
					<InsertImageButton
						editable={mode === "rich" && !readOnly}
						onInsertMarkdown={onInsertMarkdown}
					/>
					<MarkdownHelp markdown={markdown} />
					<div className="editor-mode-switch" role="group" aria-label={translations["editor-mode"]}>
						<button
							type="button"
							className={`button button-invisible ${mode === "rich" ? "button-active" : ""}`}
							aria-label={translations["rich-editor"]}
							aria-pressed={mode === "rich"}
							title={translations["rich-editor"]}
							onClick={(): void => onModeChange("rich")}
						>
							<IconEdit {...iconProps} stroke={1.8} />
						</button>
						<button
							type="button"
							className={`button button-invisible ${mode === "source" ? "button-active" : ""}`}
							aria-label={translations["markdown-source"]}
							aria-pressed={mode === "source"}
							title={`${translations["markdown-source"]} (⌘⇧M)`}
							onClick={(): void => onModeChange("source")}
						>
							<IconMarkdown {...iconProps} stroke={1.8} />
						</button>
					</div>
				</div>
			</div>
			<div className="editor-word-count">
				<WordCountWrapper />
			</div>
		</div>
	);
}
