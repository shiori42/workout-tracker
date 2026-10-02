"use client";

import { useRef, useState } from "react";
import { clear as clearPhotos } from "idb-keyval";
import { exportData, useApp, type AppData } from "@/lib/store";
import { GOAL_PRESETS, SAMPLE_EXERCISES, SAMPLE_TEMPLATES } from "@/lib/constants";
import { ymd } from "@/lib/date";
import {
  notificationPermission,
  requestNotificationPermission,
  showSystemNotification,
} from "@/lib/notify";
import { toast } from "@/lib/toast";
import { bodyCsv, downloadText, mealCsv, workoutCsv } from "@/lib/csv";
import { Button, Card, Input, NumberInput, PageHeader, Sheet, Toggle, cx } from "@/components/ui";
import { AccountCard, PushSection } from "@/components/SettingsCloud";

export default function SettingsPage() {
  const data = useApp();
  const s = data.settings;
  const [perm, setPerm] = useState(() => notificationPermission());
  const [resetOpen, setResetOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kintore-backup-${ymd()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    try {
      const json = JSON.parse(await file.text()) as Partial<AppData>;
      if (!json || typeof json !== "object" || !json.settings) throw new Error("invalid");
      data.importData(json);
      toast("データを読み込みました", undefined, "📥");
    } catch {
      toast("読み込みに失敗しました", "バックアップファイルを確認してください", "⚠️");
    }
  };

  return (
    <div>
      <PageHeader title="設定" back />
      <div className="space-y-3 px-4 pt-3 pb-4">
        <AccountCard />

        <Card title="プロフィール">
          <Row label="ニックネーム">
            <Input
              value={s.nickname}
              onChange={(e) => data.updateSettings({ nickname: e.target.value })}
              className="w-40 text-right"
              placeholder="未設定"
            />
          </Row>
        </Card>

        <Card title="目標・継続">
          <div className="mb-1 text-sm font-bold">月間トレーニング目標</div>
          <div className="flex items-center gap-2">
            {GOAL_PRESETS.map((g) => (
              <button
                key={g}
                onClick={() => data.updateSettings({ monthlyGoal: g })}
                className={cx(
                  "h-10 flex-1 rounded-xl text-sm font-bold whitespace-nowrap",
                  s.monthlyGoal === g ? "bg-accent" : "bg-card2 text-muted",
                )}
              >
                {g}回
              </button>
            ))}
            <NumberInput
              value={s.monthlyGoal}
              min={1}
              onChange={(v) => data.updateSettings({ monthlyGoal: Math.max(1, Math.min(31, Math.round(v))) })}
              className="h-10 w-16 shrink-0 text-center"
              aria-label="目標回数"
            />
          </div>
          <div className="mt-4">
            <Row label="休養日もストリークに含める" sub="曜日スケジュールで「休養日」の日は達成扱い">
              <Toggle checked={s.restCountsForStreak} onChange={(v) => data.updateSettings({ restCountsForStreak: v })} />
            </Row>
          </div>
        </Card>

        <Card title="通知">
          <PushSection />
          <div className="mb-3 flex items-center justify-between rounded-xl bg-card2 px-3 py-2.5">
            <div className="text-xs">
              <div className="font-bold">ブラウザ通知</div>
              <div className="text-muted">
                {perm === "granted" && "許可済み"}
                {perm === "denied" && "ブロック中（ブラウザ設定から許可してください）"}
                {perm === "default" && "未許可（許可しない場合はアプリ内通知になります）"}
                {perm === "unsupported" && "非対応（アプリ内通知で代替します）"}
              </div>
            </div>
            {perm === "default" && (
              <Button
                size="sm"
                onClick={async () => {
                  setPerm(await requestNotificationPermission());
                }}
              >
                許可する
              </Button>
            )}
            {perm === "granted" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const ok = await showSystemNotification("テスト通知", "通知は正常に動作しています");
                  if (!ok) toast("テスト通知", "アプリ内通知で表示しました", "🔔");
                }}
              >
                テスト
              </Button>
            )}
          </div>

          <div className="divide-y divide-line/60">
            <NotifRow
              label="トレーニング予定"
              sub="曜日スケジュールに応じて「今日は胸の日」「今日は休養日」などを通知"
              enabled={s.notif.training.enabled}
              onToggle={(v) => data.updateNotif("training", { enabled: v })}
            >
              <TimeInput value={s.notif.training.time} onChange={(v) => data.updateNotif("training", { time: v })} />
            </NotifRow>
            <NotifRow
              label="月次身体記録"
              sub="毎月指定日に身長・体重・写真の記録を通知"
              enabled={s.notif.body.enabled}
              onToggle={(v) => data.updateNotif("body", { enabled: v })}
            >
              <div className="flex items-center gap-1 text-xs text-muted">
                毎月
                <NumberInput
                  value={s.notif.body.day}
                  min={1}
                  onChange={(v) => data.updateNotif("body", { day: Math.max(1, Math.min(28, Math.round(v))) })}
                  className="h-9 w-14 text-center"
                />
                日
                <TimeInput value={s.notif.body.time} onChange={(v) => data.updateNotif("body", { time: v })} />
              </div>
            </NotifRow>
            <NotifRow
              label="食事記録忘れ"
              sub="指定時刻までに食事記録がない場合に通知"
              enabled={s.notif.meal.enabled}
              onToggle={(v) => data.updateNotif("meal", { enabled: v })}
            >
              <TimeInput value={s.notif.meal.time} onChange={(v) => data.updateNotif("meal", { time: v })} />
            </NotifRow>
            <NotifRow
              label="インターバル終了"
              sub="別画面表示中でもタイマー終了を通知"
              enabled={s.notif.interval.enabled}
              onToggle={(v) => data.updateNotif("interval", { enabled: v })}
            />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted">
            ※ 通知はブラウザ / OSの権限に依存します。iPhoneではホーム画面に追加（PWA）してから通知を有効にしてください。プッシュ通知がオフの場合は、アプリを開いている間のみ通知します。
          </p>
        </Card>

        <Card title="単位">
          <Row label="重量">kg</Row>
          <Row label="身長">cm</Row>
          <Row label="カロリー">kcal</Row>
        </Card>

        <Card title="データ管理">
          <div className="space-y-2">
            <Button variant="secondary" className="w-full" onClick={doExport}>
              バックアップを書き出す（JSON）
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="secondary" onClick={() => downloadText(workoutCsv(data), `kintore-workouts-${ymd()}.csv`)}>
                筋トレCSV
              </Button>
              <Button size="sm" variant="secondary" onClick={() => downloadText(mealCsv(data), `kintore-meals-${ymd()}.csv`)}>
                食事CSV
              </Button>
              <Button size="sm" variant="secondary" onClick={() => downloadText(bodyCsv(data), `kintore-body-${ymd()}.csv`)}>
                身体CSV
              </Button>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}>
              バックアップから復元
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void doImport(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                data.loadSamples();
                toast("サンプルメニューを追加しました", undefined, "✨");
              }}
            >
              サンプルメニューを追加
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => setReplaceOpen(true)}>
              メニューを標準セット（{SAMPLE_EXERCISES.length}種目）に置き換え
            </Button>
            <Button variant="danger" className="w-full" onClick={() => setResetOpen(true)}>
              すべてのデータを削除
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-muted">※ 写真はバックアップファイルに含まれません。</p>
        </Card>

        <p className="text-center text-[10px] text-muted">筋トレ管理アプリ v1.2</p>
      </div>

      <Sheet
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        title="メニューを置き換えますか？"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setReplaceOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={() => {
                data.replaceWithSamples();
                setReplaceOpen(false);
                toast("メニューを置き換えました", `${SAMPLE_EXERCISES.length}種目・${SAMPLE_TEMPLATES.length}テンプレート`, "✨");
              }}
            >
              置き換える
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          種目・テンプレート・曜日スケジュールを標準セットに置き換えます（
          {SAMPLE_TEMPLATES.map((t) => t.name).join("／")}）。同じ名前の種目は記録の履歴を引き継ぎます。トレーニング記録・食事・身体記録は消えません。
        </p>
      </Sheet>

      <Sheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="すべてのデータを削除しますか？"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await clearPhotos();
                data.resetAll();
                setResetOpen(false);
              }}
            >
              削除する
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          トレーニング・食事・身体記録・写真・設定がすべて削除され、初期設定からやり直しになります。ログイン中はクラウド上のデータも削除されます。この操作は取り消せません。
        </p>
      </Sheet>
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <div className="text-sm font-bold">{label}</div>
        {sub && <div className="text-[11px] text-muted">{sub}</div>}
      </div>
      <div className="shrink-0 text-sm text-muted">{children}</div>
    </div>
  );
}

function NotifRow({
  label,
  sub,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  sub: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold">{label}</div>
          <div className="text-[11px] text-muted">{sub}</div>
        </div>
        <Toggle checked={enabled} onChange={onToggle} label={label} />
      </div>
      {children && <div className={cx("mt-2 flex justify-end", !enabled && "pointer-events-none opacity-40")}>{children}</div>}
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className="h-9 rounded-lg border border-line bg-card2 px-2 text-sm text-white outline-none focus:border-accent"
    />
  );
}
