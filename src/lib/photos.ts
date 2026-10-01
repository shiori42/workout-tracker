"use client";

import { del, get, set } from "idb-keyval";
import { uid, useApp } from "./store";
import { currentUserId, getSupabase } from "./supabase";

const BUCKET = "photos";

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

/** "body:xxxx" → "<userId>/body/xxxx.jpg"（本人フォルダ配下のみ RLS で許可） */
const storagePath = (userId: string, key: string) => `${userId}/${key.replace(":", "/")}.jpg`;
const uploadedFlag = (key: string) => `uploaded:${key}`;

async function uploadOne(userId: string, key: string, blob: Blob) {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(storagePath(userId, key), blob, { upsert: true, contentType: "image/jpeg" });
  if (error) return false;
  await set(uploadedFlag(key), userId);
  return true;
}

export async function savePhoto(file: File, prefix: string) {
  const blob = await compressImage(file);
  const key = `${prefix}:${uid()}`;
  await set(key, blob);
  const userId = currentUserId();
  if (userId) void uploadOne(userId, key, blob);
  return key;
}

export async function loadPhoto(key: string): Promise<Blob | undefined> {
  const local = await get<Blob>(key);
  if (local) return local;
  const sb = getSupabase();
  const userId = currentUserId();
  if (!sb || !userId) return undefined;
  const { data, error } = await sb.storage.from(BUCKET).download(storagePath(userId, key));
  if (error || !data) return undefined;
  await set(key, data);
  await set(uploadedFlag(key), userId);
  return data;
}

export async function deletePhoto(key: string) {
  await del(key);
  await del(uploadedFlag(key));
  const sb = getSupabase();
  const userId = currentUserId();
  if (sb && userId) await sb.storage.from(BUCKET).remove([storagePath(userId, key)]);
}

/** 端末にしかない写真をクラウドへアップロードする（オフライン中に追加した写真の後送り） */
export async function uploadPendingPhotos(userId: string) {
  const st = useApp.getState();
  const keys = [
    ...st.bodyRecords.flatMap((r) => r.photos.map((p) => p.key)),
    ...st.meals.flatMap((m) => (m.photoKey ? [m.photoKey] : [])),
  ];
  for (const key of keys) {
    if ((await get(uploadedFlag(key))) === userId) continue;
    const blob = await get<Blob>(key);
    if (blob) await uploadOne(userId, key, blob);
  }
}
