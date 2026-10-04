// Makes two copies of the chosen photo on the device, both JPEG, both with phone rotation applied:
// - the one sent to the AI: longest side 1280 px (`base64`, `width`, `height` — also the palace's coordinate size);
// - the one shown and kept on the device: longest side 2048 px (`blob`, `url`), so zooming in stays sharp.

export type ShrunkPhoto = { blob: Blob; url: string; width: number; height: number; base64: string };

export class UnreadablePhoto extends Error {
  constructor() {
    super("That file isn't a photo we can open. Try a JPG or PNG.");
  }
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new UnreadablePhoto();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]+,/, ""));
    reader.onerror = () => reject(new UnreadablePhoto());
    reader.readAsDataURL(blob);
  });
}

async function draw(source: ImageBitmap | HTMLImageElement, maxSide: number, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new UnreadablePhoto();
  ctx.drawImage(source, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new UnreadablePhoto())), "image/jpeg", quality),
  );
  return { blob, width, height };
}

export async function shrinkPhoto(file: Blob, aiSide = 1280, displaySide = 2048): Promise<ShrunkPhoto> {
  if (file.type && !file.type.startsWith("image/")) throw new UnreadablePhoto();
  const source = await decode(file);
  if (!source.width || !source.height) throw new UnreadablePhoto();
  const ai = await draw(source, aiSide, 0.82);
  const display = await draw(source, displaySide, 0.85);
  if ("close" in source) source.close();
  return { blob: display.blob, url: URL.createObjectURL(display.blob), width: ai.width, height: ai.height, base64: await blobToBase64(ai.blob) };
}
