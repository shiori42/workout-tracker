"use client";

import { useEffect, useState } from "react";
import { clear as clearPhotos } from "idb-keyval";
import { cloudEnabled, getSupabase, useCloud } from "@/lib/supabase";
import { pushNow, reconcile, resetSyncState } from "@/lib/sync";
import { useApp } from "@/lib/store";
import { fmtDateTime } from "@/lib/date";
import { disablePush, enablePush, pushConfig, pushSupported, testPush, usePush } from "@/lib/push";
import { toast } from "@/lib/toast";
import { Button, Card, LinkButton, Sheet, Toggle } from "./ui";

const STATUS_LABEL = {
  disabled: "クラウド未設定",
  "signed-out": "未ログイン",
  idle: "同期済み",
  syncing: "同期中…",
  offline: "オフライン（復帰後に自動同期）",
  error: "同期エラー",
} as const;

export function AccountCard() {
  const { user, status, lastSyncedAt, error, ready } = useCloud();
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!cloudEnabled) {
    return (
      <Card title="アカウント・同期">
        <p className="text-xs leading-relaxed text-muted">
          クラウド（Supabase）が未設定のため、すべてのデータをこの端末内に保存しています。環境変数
          NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定すると、ログイン・複数端末同期・写真のクラウド保存が利用できます。
        </p>
      </Card>
    );
  }

  const logout = async (wipe: boolean) => {
    setLogoutOpen(false);
    await getSupabase()?.auth.signOut();
    resetSyncState();
    if (wipe) {
      await clearPhotos();
      useApp.getState().resetAll();
    }
    toast("ログアウトしました", wipe ? "この端末のデータを削除しました" : undefined, "👋");
  };

  return (
    <Card title="アカウント・同期">
      {!ready ? (
        <p className="text-xs text-muted">確認中…</p>
      ) : !user ? (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            ログインすると記録がクラウドに保存され、機種変更や複数端末でも同じデータを使えます。未ログインでもこの端末内で利用できます。
          </p>
          <LinkButton href="/login" className="w-full">
            ログイン / 新規登録
          </LinkButton>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl bg-card2 px-3 py-2.5 text-xs">
            <div className="truncate font-bold">{user.email ?? "ログイン中"}</div>
            <div className={status === "error" ? "text-red-400" : "text-muted"}>
              {STATUS_LABEL[status]}
              {lastSyncedAt && status !== "syncing" && ` ・ 最終同期 ${fmtDateTime(lastSyncedAt)}`}
            </div>
            {status === "error" && error && <div className="mt-1 break-all text-[10px] text-red-300/80">{error}</div>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              disabled={status === "syncing"}
              onClick={async () => {
                await reconcile();
                await pushNow();
                const st = useCloud.getState();
                if (st.status === "idle") toast("同期しました", undefined, "☁️");
              }}
            >
              今すぐ同期
            </Button>
            <Button variant="secondary" onClick={() => setLogoutOpen(true)}>
              ログアウト
            </Button>
          </div>
        </div>
      )}

      <Sheet
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="ログアウト"
        footer={
          <div className="grid gap-2">
            <Button variant="secondary" onClick={() => void logout(false)}>
              ログアウト（この端末のデータは残す）
            </Button>
            <Button variant="danger" onClick={() => void logout(true)}>
              ログアウトしてこの端末のデータを削除
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          クラウド上のデータは削除されません。共有端末の場合は「この端末のデータを削除」を選んでください。
        </p>
      </Sheet>
    </Card>
  );
}

export function PushSection() {
  const enabled = usePush((s) => s.enabled);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void pushConfig().then((c) => alive && setAvailable(c.enabled && pushSupported()));
    return () => {
      alive = false;
    };
  }, []);

  if (available === false) {
    return (
      <p className="mb-3 rounded-xl bg-card2 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
        プッシュ通知サーバーが未設定、またはこのブラウザが非対応のため、アプリを開いている間の通知のみ動作します。
      </p>
    );
  }
  if (available === null) return null;

  return (
    <div className="mb-3 rounded-xl bg-card2 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs">
          <div className="font-bold">プッシュ通知（アプリを閉じていても届く）</div>
          <div className="text-muted">{enabled ? "有効" : "無効"}</div>
        </div>
        <Toggle
          checked={enabled}
          label="プッシュ通知"
          onChange={async (v) => {
            if (busy) return;
            setBusy(true);
            if (v) {
              const r = await enablePush();
              const msg = {
                ok: ["プッシュ通知を有効にしました", "🔔"],
                denied: ["通知がブロックされています", "⚠️"],
                unsupported: ["このブラウザは非対応です", "⚠️"],
                not_configured: ["通知サーバーが未設定です", "⚠️"],
                error: ["登録に失敗しました", "⚠️"],
              }[r];
              toast(msg[0], r === "denied" ? "ブラウザの設定から通知を許可してください" : undefined, msg[1]);
            } else {
              await disablePush();
              toast("プッシュ通知をオフにしました", undefined, "🔕");
            }
            setBusy(false);
          }}
        />
      </div>
      {enabled && (
        <Button
          size="sm"
          variant="secondary"
          className="mt-2 w-full"
          onClick={async () => {
            const ok = await testPush();
            if (!ok) toast("送信に失敗しました", "通知を一度オフ→オンにしてください", "⚠️");
          }}
        >
          サーバーからテスト送信
        </Button>
      )}
    </div>
  );
}
