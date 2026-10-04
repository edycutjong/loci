// Shrinks the chosen photo on the device before anything is sent: longest side 1280 px, JPEG.
// Phone photos keep their real orientation (EXIF rotation is applied while decoding).

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

export async function shrinkPhoto(file: Blob, maxSide = 1280, quality = 0.82): Promise<ShrunkPhoto> {
  if (file.type && !file.type.startsWith("image/")) throw new UnreadablePhoto();
  const source = await decode(file);
  const sw = source.width;
  const sh = source.height;
  if (!sw || !sh) throw new UnreadablePhoto();
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const width = Math.round(sw * scale);
  const height = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new UnreadablePhoto();
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source) source.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new UnreadablePhoto())), "image/jpeg", quality),
  );
  return { blob, url: URL.createObjectURL(blob), width, height, base64: await blobToBase64(blob) };
}
