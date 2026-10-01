"use client";

import { useState } from "react";

const KEY = "kintore-install-hint-dismissed";

function shouldShow() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone && localStorage.getItem(KEY) !== "1";
}

/** iPhone の Safari ではホーム画面に追加しないとプッシュ通知が使えないため案内する */
export function InstallHint() {
  const [show, setShow] = useState(shouldShow);
  if (!show) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-3 text-xs leading-relaxed">
      <span className="text-xl">📲</span>
      <span className="flex-1">
        <span className="block font-bold">ホーム画面に追加してください</span>
        Safari の共有ボタン（□↑）→「ホーム画面に追加」で、アプリのように起動でき、通知も受け取れます。
      </span>
      <button
        aria-label="閉じる"
        onClick={() => {
          localStorage.setItem(KEY, "1");
          setShow(false);
        }}
        className="text-base text-muted"
      >
        ×
      </button>
    </div>
  );
}
