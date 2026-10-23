import { nativeImage } from "electron";
import { prepareImportedImage } from "../src/main/services/imageImport";

jest.mock("electron", () => ({ nativeImage: { createFromBuffer: jest.fn() } }));

function mockImage(width: number, height: number, output: Buffer) {
	const resized = { toJPEG: jest.fn(() => output), toPNG: jest.fn(() => output) };
	const image = {
		isEmpty: () => false,
		getSize: () => ({ width, height }),
		resize: jest.fn(() => resized),
	};
	(nativeImage.createFromBuffer as jest.Mock).mockReturnValue(image);
	return { image, resized };
}

test("large JPEG photos are resized proportionally and use a smaller payload", () => {
	const input = Buffer.alloc(1000);
	const output = Buffer.alloc(200);
	const { image, resized } = mockImage(4000, 3000, output);
	expect(prepareImportedImage(input, "jpg")).toEqual({ content: output, mime: "jpeg" });
	expect(image.resize).toHaveBeenCalledWith({ width: 2560, height: 1920, quality: "best" });
	expect(resized.toJPEG).toHaveBeenCalledWith(88);
});

test("PNG images keep their alpha channel and are never converted to JPEG", () => {
	const { resized } = mockImage(3000, 3000, Buffer.alloc(10));
	expect(prepareImportedImage(Buffer.alloc(100), "png").mime).toBe("png");
	expect(resized.toJPEG).not.toHaveBeenCalled();
});

test("small images and animated formats preserve their original bytes", () => {
	const input = Buffer.alloc(10);
	const { image } = mockImage(800, 600, Buffer.alloc(1));
	expect(prepareImportedImage(input, "png").content).toBe(input);
	expect(image.resize).not.toHaveBeenCalled();
	(nativeImage.createFromBuffer as jest.Mock).mockClear();
	expect(prepareImportedImage(input, "gif").content).toBe(input);
	expect(prepareImportedImage(input, "webp").content).toBe(input);
	expect(nativeImage.createFromBuffer).not.toHaveBeenCalled();
});
