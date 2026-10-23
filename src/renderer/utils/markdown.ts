import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	CHECK_LIST,
	CODE,
	ElementTransformer,
	TextMatchTransformer,
	HEADING,
	INLINE_CODE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	LINK,
	ORDERED_LIST,
	QUOTE,
	STRIKETHROUGH,
	UNORDERED_LIST,
} from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
	$createHorizontalRuleNode,
	$isHorizontalRuleNode,
	HorizontalRuleNode,
} from "@lexical/react/LexicalHorizontalRuleNode";
import { Klass, LexicalNode } from "lexical";

import {
	ImageNode,
	$createImageNode,
	$isImageNode,
} from "../components/elements/editor/editor/ImageNode";

const IMAGE: TextMatchTransformer = {
	dependencies: [ImageNode],
	export: (node) => ($isImageNode(node) ? node.getMarkdown() : null),
	importRegExp: /!\[((?:\\.|[^\]\\])*)\]\(([^)\s]+)\)/,
	regExp: /!\[((?:\\.|[^\]\\])*)\]\(([^)\s]+)\)$/,
	replace: (node, match) => {
		node.replace($createImageNode(match[2], match[1].replace(/\\([[\]\\])/g, "$1")));
	},
	trigger: ")",
	type: "text-match",
};

const HORIZONTAL_RULE: ElementTransformer = {
	dependencies: [HorizontalRuleNode],
	export: (node) => ($isHorizontalRuleNode(node) ? "---" : null),
	regExp: /^(---|\*\*\*|___)\s?$/,
	replace: (parentNode) => {
		parentNode.replace($createHorizontalRuleNode());
	},
	type: "element",
};

export const MARKDOWN_TRANSFORMERS = [
	HORIZONTAL_RULE,
	HEADING,
	QUOTE,
	CODE,
	CHECK_LIST,
	UNORDERED_LIST,
	ORDERED_LIST,
	INLINE_CODE,
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	STRIKETHROUGH,
	IMAGE,
	LINK,
];

export const MARKDOWN_NODES: Array<Klass<LexicalNode>> = [
	ImageNode,
	HeadingNode,
	QuoteNode,
	ListNode,
	ListItemNode,
	CodeNode,
	CodeHighlightNode,
	LinkNode,
	AutoLinkNode,
	HorizontalRuleNode,
];

export function normalizeMarkdown(markdown: string): string {
	return markdown.replace(/\r\n?/g, "\n").trim();
}

export function escapeMarkdownText(text: string): string {
	return text.replace(/([\\`*_[\]<>#])/g, "\\$1");
}

export function isSafeExternalUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return (
			parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:"
		);
	} catch (_) {
		return false;
	}
}
