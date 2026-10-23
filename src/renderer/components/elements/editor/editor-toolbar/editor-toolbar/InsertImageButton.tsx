import { IconPhoto } from "@tabler/icons-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$createTextNode,
	$getRoot,
	$getSelection,
	$isRangeSelection,
	$setSelection,
} from "lexical";
import React, { ReactElement, useEffect, useRef } from "react";
import { $createImageNode } from "../../editor/ImageNode";
import { translations } from "../../../../../utils/i18n";
import { iconProps } from "../../../../../utils/icons";

interface Props {
	editable: boolean;
	onInsertMarkdown: (markdown: string) => void;
}
export default function InsertImageButton({ editable, onInsertMarkdown }: Props): ReactElement {
	const [editor] = useLexicalComposerContext();
	const mounted = useRef(true);
	const busy = useRef(false);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const insert = async (): Promise<void> => {
		if (busy.current) return;
		busy.current = true;
		const selection = editor.getEditorState().read(() => $getSelection()?.clone() ?? null);
		try {
			const image = await window.miniDiary.dialogs.importImage();
			if (!image || !mounted.current) return;
			if (editable) {
				editor.update(
					() => {
						$setSelection(selection);
						if (!$isRangeSelection($getSelection())) $getRoot().selectEnd();
						const target = $getSelection();
						if (!$isRangeSelection(target)) return;
						const after = $createTextNode(" ");
						target.insertNodes([$createImageNode(image.dataUrl, image.name), after]);
						after.selectEnd();
					},
					{ tag: "history-push" },
				);
				editor.focus();
			} else onInsertMarkdown(`![${image.name.replace(/[[\]\\]/g, "\\$&")}](${image.dataUrl})`);
		} catch (error) {
			if (mounted.current)
				await window.miniDiary.dialogs.showError(translations["insert-image"], error.message);
		} finally {
			busy.current = false;
		}
	};
	return (
		<button
			type="button"
			className="button button-invisible"
			aria-label={translations["insert-image"]}
			title={translations["insert-image"]}
			onClick={() => {
				void insert();
			}}
		>
			<IconPhoto {...iconProps} stroke={1.8} />
		</button>
	);
}
