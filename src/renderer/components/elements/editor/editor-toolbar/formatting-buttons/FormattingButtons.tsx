import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
	INSERT_CHECK_LIST_COMMAND,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import {
	$createHeadingNode,
	$createQuoteNode,
	$isHeadingNode,
	$isQuoteNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
	$createParagraphNode,
	$getSelection,
	$setSelection,
	BaseSelection,
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	LexicalEditor,
	SELECTION_CHANGE_COMMAND,
} from "lexical";
import {
	IconBold,
	IconChecklist,
	IconCode,
	IconItalic,
	IconLink,
	IconList,
	IconListNumbers,
	IconMinus,
	IconStrikethrough,
	IconDots,
} from "@tabler/icons-react";
import React, { ReactElement, useEffect, useRef, useState } from "react";

import { translations } from "../../../../../utils/i18n";
import { iconProps } from "../../../../../utils/icons";
import LinkDialog from "./LinkDialog";

const STROKE_WIDTH = 1.8;

interface FormatState {
	isBold: boolean;
	isItalic: boolean;
	isCode: boolean;
	isStrikethrough: boolean;
	blockType: string;
}

function readFormatState(
	editor: LexicalEditor,
	setFormatState: (state: FormatState) => void,
): void {
	editor.getEditorState().read((): void => {
		const selection = $getSelection();
		if (!$isRangeSelection(selection)) return;
		const topLevel = selection.anchor.getNode().getTopLevelElementOrThrow();
		let blockType = "paragraph";
		if ($isHeadingNode(topLevel)) blockType = topLevel.getTag();
		else if ($isQuoteNode(topLevel)) blockType = "quote";
		setFormatState({
			isBold: selection.hasFormat("bold"),
			isItalic: selection.hasFormat("italic"),
			isCode: selection.hasFormat("code"),
			isStrikethrough: selection.hasFormat("strikethrough"),
			blockType,
		});
	});
}

export default function FormattingButtons(): ReactElement {
	const [editor] = useLexicalComposerContext();
	const [linkOpen, setLinkOpen] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);
	const moreRef = useRef<HTMLDivElement>(null);
	const moreSelection = useRef<BaseSelection | null>(null);
	const linkSelection = useRef<BaseSelection | null>(null);
	const [formatState, setFormatState] = useState<FormatState>({
		isBold: false,
		isItalic: false,
		isCode: false,
		isStrikethrough: false,
		blockType: "paragraph",
	});
	useEffect(
		() =>
			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				(): boolean => {
					readFormatState(editor, setFormatState);
					return false;
				},
				0,
			),
		[editor],
	);

	useEffect(() => {
		if (!moreOpen) return undefined;
		moreRef.current?.querySelector<HTMLButtonElement>(".formatting-more-popover button")?.focus();
		const outside = (event: MouseEvent): void => {
			if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
		};
		const escape = (event: KeyboardEvent): void => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			event.stopPropagation();
			setMoreOpen(false);
			moreRef.current?.querySelector<HTMLButtonElement>(":scope > button")?.focus();
		};
		document.addEventListener("mousedown", outside);
		document.addEventListener("keydown", escape, true);
		return () => {
			document.removeEventListener("mousedown", outside);
			document.removeEventListener("keydown", escape, true);
		};
	}, [moreOpen]);
	const applyMore = (action: () => void): void => {
		editor.update(() => {
			$setSelection(moreSelection.current);
			action();
		});
		setMoreOpen(false);
		editor.focus();
	};
	const extraActions = [
		{
			label: translations.strikethrough,
			Icon: IconStrikethrough,
			active: formatState.isStrikethrough,
			action: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough"),
		},
		{
			label: translations["inline-code"],
			Icon: IconCode,
			active: formatState.isCode,
			action: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code"),
		},
		{
			label: translations["horizontal-rule"],
			Icon: IconMinus,
			action: () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
		},
		{
			label: translations.checklist,
			Icon: IconChecklist,
			action: () => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
		},
		{
			label: translations.list,
			Icon: IconListNumbers,
			action: () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
		},
	];

	const formatText = (format: "bold" | "italic" | "code" | "strikethrough"): void => {
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
	};
	const title = (label: string, shortcut?: string): string =>
		shortcut ? `${label} (${shortcut})` : label;
	const insertLink = (): void => {
		editor.getEditorState().read(() => {
			linkSelection.current = $getSelection()?.clone() || null;
		});
		setLinkOpen(true);
	};

	return (
		<div className="formatting-buttons" role="group" aria-label={translations["block-style"]}>
			{linkOpen && (
				<LinkDialog
					onClose={() => setLinkOpen(false)}
					onApply={(url) => {
						setLinkOpen(false);
						editor.update(() => {
							$setSelection(linkSelection.current);
							editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
						});
					}}
				/>
			)}
			<div className="toolbar-group toolbar-block-group">
				<select
					className="block-format-select"
					aria-label={translations["block-style"]}
					title={translations["block-style"]}
					value={formatState.blockType}
					onChange={(event): void => {
						const blockType = event.currentTarget.value;
						editor.update((): void => {
							const selection = $getSelection();
							if (!$isRangeSelection(selection)) return;
							if (blockType === "quote") $setBlocksType(selection, () => $createQuoteNode());
							else if (/^h[1-3]$/.test(blockType))
								$setBlocksType(selection, () =>
									$createHeadingNode(blockType as "h1" | "h2" | "h3"),
								);
							else $setBlocksType(selection, () => $createParagraphNode());
						});
					}}
				>
					<option value="paragraph">{translations.paragraph}</option>
					<option value="h1">{translations["heading-1"]}</option>
					<option value="h2">{translations["heading-2"]}</option>
					<option value="h3">{translations["heading-3"]}</option>
					<option value="quote">{translations.quote}</option>
				</select>
			</div>
			<div className="toolbar-group toolbar-text-group">
				<button
					type="button"
					className={`button button-invisible ${formatState.isBold ? "button-active" : ""}`}
					aria-label={title(translations.bold, "⌘B")}
					aria-pressed={formatState.isBold}
					title={title(translations.bold, "⌘B")}
					onClick={(): void => formatText("bold")}
				>
					<IconBold {...iconProps} stroke={STROKE_WIDTH} />
				</button>
				<button
					type="button"
					className={`button button-invisible ${formatState.isItalic ? "button-active" : ""}`}
					aria-label={title(translations.italic, "⌘I")}
					aria-pressed={formatState.isItalic}
					title={title(translations.italic, "⌘I")}
					onClick={(): void => formatText("italic")}
				>
					<IconItalic {...iconProps} stroke={STROKE_WIDTH} />
				</button>
			</div>
			<div className="toolbar-group toolbar-insert-group">
				<button
					type="button"
					className="button button-invisible"
					aria-label={title(translations.link, "⌘K")}
					title={title(translations.link, "⌘K")}
					onClick={insertLink}
				>
					<IconLink {...iconProps} stroke={STROKE_WIDTH} />
				</button>
			</div>
			<div className="toolbar-group toolbar-list-group">
				<button
					type="button"
					className="button button-invisible"
					aria-label={translations.bullets}
					title={translations.bullets}
					onClick={(): void => {
						editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
					}}
				>
					<IconList {...iconProps} stroke={STROKE_WIDTH} />
				</button>
			</div>
			<div
				className="formatting-more"
				role="group"
				aria-label={translations["more-formatting"]}
				ref={moreRef}
				onBlur={(event) => {
					if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
						setMoreOpen(false);
				}}
			>
				<button
					type="button"
					className={`button button-invisible ${moreOpen ? "button-active" : ""}`}
					aria-label={translations["more-formatting"]}
					title={translations["more-formatting"]}
					aria-expanded={moreOpen}
					aria-controls="formatting-more-actions"
					onClick={() => {
						editor.getEditorState().read(() => {
							moreSelection.current = $getSelection()?.clone() ?? null;
						});
						setMoreOpen(!moreOpen);
					}}
				>
					<IconDots {...iconProps} stroke={STROKE_WIDTH} />
				</button>
				{moreOpen && (
					<div
						className="formatting-more-popover"
						id="formatting-more-actions"
						role="group"
						aria-label={translations["more-formatting"]}
					>
						{extraActions.map(({ label, Icon, active, action }) => (
							<button
								key={label}
								type="button"
								className={`button button-invisible ${active ? "button-active" : ""}`}
								aria-pressed={active}
								onClick={() => applyMore(action)}
							>
								<Icon {...iconProps} stroke={STROKE_WIDTH} />
								<span>{label}</span>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
