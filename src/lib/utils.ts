import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simple client-side image compression using canvas.
// - Resizes large images to a max width/height
// - Reduces JPEG quality until under maxSizeBytes or quality floor.
export async function compressImageFile(
  file: File,
  maxSizeBytes = 400 * 1024, // ~0.4 MB
  maxWidth = 1600,
  maxHeight = 1600
): Promise<File> {
  // If already small enough, keep original
  if (file.size <= maxSizeBytes) return file;

  const imageDataUrl = await readFileAsDataURL(file);
  const img = await loadImage(imageDataUrl);

  const { canvas, ctx } = createCanvas(img, maxWidth, maxHeight);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Try a few quality levels
  const qualities = [0.8, 0.6, 0.4];
  for (const quality of qualities) {
    const blob = await canvasToBlob(canvas, file.type || "image/jpeg", quality);
    if (!blob) break;
    if (blob.size <= maxSizeBytes || quality === qualities[qualities.length - 1]) {
      return new File([blob], file.name, { type: blob.type });
    }
  }

  // Fallback: return original if something went wrong
  return file;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function createCanvas(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  canvas.width = width;
  canvas.height = height;

  return { canvas, ctx };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      type === "image/png" ? "image/png" : "image/jpeg",
      quality
    );
  });
}
