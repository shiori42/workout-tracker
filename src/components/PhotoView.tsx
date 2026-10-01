"use client";

import { useEffect, useState } from "react";
import { loadPhoto } from "@/lib/photos";
import { cx } from "./ui";

/** 端末内（IndexedDB）またはログイン中は本人専用ストレージの画像を表示する */
export function PhotoView({
  photoKey,
  alt,
  className,
  onClick,
}: {
  photoKey: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    loadPhoto(photoKey).then((blob) => {
      if (revoked || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoKey]);

  if (!url) return <div className={cx("animate-pulse bg-card2", className)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} onClick={onClick} className={cx("object-cover", className)} />
  );
}
