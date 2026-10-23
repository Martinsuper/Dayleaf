import React, { ReactElement } from "react";
import {
	$applyNodeReplacement,
	DecoratorNode,
	LexicalNode,
	NodeKey,
	SerializedLexicalNode,
	Spread,
} from "lexical";

type SerializedImageNode = Spread<
	{ src: string; alt: string; type: "image"; version: 1 },
	SerializedLexicalNode
>;

export function isSafeImageSource(src: string): boolean {
	return (
		/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(src) ||
		/^https?:\/\//i.test(src)
	);
}

/** An inline decorator keeps surrounding paragraphs editable and participates in undo/redo. */
export class ImageNode extends DecoratorNode<ReactElement> {
	src: string;

	alt: string;

	static getType(): string {
		return "image";
	}

	static clone(node: ImageNode): ImageNode {
		return new ImageNode(node.src, node.alt, node.getKey());
	}

	constructor(src: string, alt: string, key?: NodeKey) {
		super(key);
		this.src = src;
		this.alt = alt;
	}

	static importJSON(serialized: SerializedImageNode): ImageNode {
		return $createImageNode(serialized.src, serialized.alt);
	}

	exportJSON(): SerializedImageNode {
		return { ...super.exportJSON(), type: "image", version: 1, src: this.src, alt: this.alt };
	}

	createDOM(): HTMLElement {
		const element = document.createElement("span");
		element.className = "editor-image";
		return element;
	}

	updateDOM(): false {
		return false;
	}

	isInline(): true {
		return true;
	}

	getTextContent(): string {
		return this.alt;
	}

	getMarkdown(): string {
		return `![${this.alt.replace(/[[\]\\]/g, "\\$&")}](${this.src})`;
	}

	decorate(): ReactElement {
		return (
			<img
				src={isSafeImageSource(this.src) ? this.src : undefined}
				alt={this.alt}
				draggable={false}
			/>
		);
	}
}
export function $createImageNode(src: string, alt: string): ImageNode {
	return $applyNodeReplacement(new ImageNode(src, alt));
}
export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
	return node instanceof ImageNode;
}
