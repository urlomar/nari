const MAX_BYTES = 1_000_000;
const MAX_DIMENSION = 1600;

/**
 * Downscales and re-encodes an image client-side so uploads stay under ~1MB.
 * Always re-encodes to JPEG, even when already small enough - camera
 * captures (e.g. HEIC on iPhone) aren't a format the analysis API accepts,
 * so every photo needs to be normalized, not just the large ones.
 */
export async function compressImage(file: File): Promise<File> {
  const image = await loadImage(file);
  const { width, height } = fitDimensions(image.naturalWidth, image.naturalHeight, MAX_DIMENSION);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, width, height);

  let quality = 0.85;
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > MAX_BYTES && quality > 0.4) {
    quality -= 0.15;
    blob = await canvasToBlob(canvas, quality);
  }
  if (!blob) return file;

  return new File([blob], toJpgName(file.name), { type: "image/jpeg" });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function fitDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const scale = maxDimension / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function toJpgName(name: string) {
  return name.replace(/\.\w+$/, "") + ".jpg";
}
