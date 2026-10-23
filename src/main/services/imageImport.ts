import { nativeImage } from "electron";

/** Resize large photos before embedding; preserve animation and smaller images. */
export function prepareImportedImage(
	content: Buffer,
	extension: string,
): { content: Buffer; mime: string } {
	const mime = extension === "jpg" ? "jpeg" : extension;
	if (!["png", "jpeg"].includes(mime)) return { content, mime };
	const image = nativeImage.createFromBuffer(content);
	if (image.isEmpty()) throw Error("The selected image cannot be decoded");
	const size = image.getSize();
	const scale = Math.min(1, 2560 / Math.max(size.width, size.height));
	if (scale === 1) return { content, mime };
	const resized = image.resize({
		width: Math.max(1, Math.round(size.width * scale)),
		height: Math.max(1, Math.round(size.height * scale)),
		quality: "best",
	});
	const compressed = mime === "jpeg" ? resized.toJPEG(88) : resized.toPNG();
	return { content: compressed.length < content.length ? compressed : content, mime };
}
