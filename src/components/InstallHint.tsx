"use client";

import { useEffect, useState } from "react";
import { enablePush, pushConfig, pushSupported, usePush } from "@/lib/push";
import { toast } from "@/lib/toast";
import { Button } from "./ui";

const KEY = "kintore-install-hint-dismissed";
const PUSH_KEY = "kintore-push-prompt-dismissed";

export function isIos() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function shouldShow() {
  if (typeof window === "undefined") return false;
  return isIos() && !isStandalone() && localStorage.getItem(KEY) !== "1";
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

/** プッシュ通知が使える環境で未設定なら、アプリを閉じていても届くよう有効化を促す */
export function PushPrompt() {
  const enabled = usePush((s) => s.enabled);
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    // 権限ダイアログはタップ直後に出す必要があるため、設定は先に取得しておく
    void pushConfig().then((c) => {
      if (!alive) return;
      setAvailable(c.enabled && pushSupported());
      setDismissed(localStorage.getItem(PUSH_KEY) === "1");
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!available || enabled || dismissed) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-3 text-xs leading-relaxed">
      <span className="text-xl">🔔</span>
      <span className="flex-1">
        <span className="block font-bold">プッシュ通知をオンにしましょう</span>
        アプリを閉じていても、インターバル終了やトレーニング予定を通知します。
        <Button
          size="sm"
          className="mt-2"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await enablePush();
            setBusy(false);
            if (r === "ok") toast("プッシュ通知を有効にしました", undefined, "🔔");
            else if (r === "denied") toast("通知がブロックされています", "iPhoneの設定 → 通知 → このアプリ から許可してください", "⚠️");
            else toast("登録に失敗しました", "設定画面の「プッシュ通知」からもう一度お試しください", "⚠️");
          }}
        >
          通知をオンにする
        </Button>
      </span>
      <button
        aria-label="閉じる"
        onClick={() => {
          localStorage.setItem(PUSH_KEY, "1");
          setDismissed(true);
        }}
        className="text-base text-muted"
      >
        ×
      </button>
    </div>
  );
}
