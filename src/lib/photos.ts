"use client";

import { del, get, set } from "idb-keyval";
import { uid } from "./store";

/** アップロード前に長辺 maxSize px の JPEG へ圧縮する */
export async function compressImage(file: File, maxSize = 1080, quality = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    return blob ?? file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function savePhoto(file: File, prefix: string) {
  const blob = await compressImage(file);
  const key = `${prefix}:${uid()}`;
  await set(key, blob);
  return key;
}

export const loadPhoto = (key: string) => get<Blob>(key);

export const deletePhoto = (key: string) => del(key);
