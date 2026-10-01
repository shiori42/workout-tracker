"use client";

import { useState } from "react";
import { remainingSeconds, useTimer } from "@/lib/timerStore";
import { fmtClock } from "@/lib/date";
import { TIMER_PRESETS } from "@/lib/constants";
import { useNow } from "@/components/hooks";
import { PageHeader, cx } from "@/components/ui";
import {
  notificationPermission,
  requestNotificationPermission,
} from "@/lib/notify";
import { toast } from "@/lib/toast";

const R = 120;
const C = 2 * Math.PI * R;

export default function TimerPage() {
  const st = useTimer();
  const now = useNow(st.status === "running", 100);
  const remain = remainingSeconds(st, now);
  const ratio = st.duration > 0 ? remain / st.duration : 0;
  const idle = st.status === "idle";
  const [draft, setDraft] = useState<string>(String(st.userSeconds));
  const [perm, setPerm] = useState(() => notificationPermission());

  const commit = (v: number) => {
    st.setUserSeconds(v);
    setDraft(String(Math.max(1, Math.min(3600, Math.round(v)))));
  };

  return (
    <div>
      <PageHeader title="インターバルタイマー" />
      <div className="px-4 pt-6">
        <div className="relative mx-auto grid h-[280px] w-[280px] place-items-center">
          <svg viewBox="0 0 280 280" className="absolute inset-0 -rotate-90">
            <circle cx="140" cy="140" r={R} stroke="#20202a" strokeWidth="14" fill="none" />
            <circle
              cx="140"
              cy="140"
              r={R}
              stroke={st.status === "finished" ? "#ef4444" : "url(#grad)"}
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={C}
              strokeDashoffset={st.status === "finished" ? 0 : C * (1 - ratio)}
              style={{ transition: st.status === "running" ? "stroke-dashoffset 0.1s linear" : "none" }}
            />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff6b2c" />
                <stop offset="100%" stopColor="#ffb020" />
              </linearGradient>
            </defs>
          </svg>
          <div className="relative text-center">
            <div
              className={cx(
                "text-6xl font-extrabold tabular-nums",
                st.status === "finished" && "text-red-400",
                st.status === "paused" && "text-muted",
              )}
            >
              {fmtClock(remain)}
            </div>
            <div className="mt-2 text-sm font-bold text-muted">
              {st.status === "idle" && "待機中"}
              {st.status === "running" && "カウントダウン中"}
              {st.status === "paused" && "一時停止中"}
              {st.status === "finished" && "終了！"}
            </div>
            {st.label && <div className="mt-1 max-w-[180px] truncate text-xs text-white/70">{st.label}</div>}
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          {st.status === "idle" && (
            <button
              onClick={() => st.start()}
              className="h-16 w-48 rounded-full bg-accent text-xl font-extrabold shadow-[0_10px_30px_-8px] shadow-accent/70 active:scale-95"
            >
              開始
            </button>
          )}
          {st.status === "running" && (
            <button
              onClick={st.pause}
              className="h-16 w-48 rounded-full bg-card2 text-xl font-extrabold active:scale-95"
            >
              停止
            </button>
          )}
          {st.status === "paused" && (
            <>
              <button
                onClick={st.reset}
                className="h-16 w-28 rounded-full bg-card2 text-base font-bold text-muted active:scale-95"
              >
                リセット
              </button>
              <button
                onClick={st.resume}
                className="h-16 w-40 rounded-full bg-accent text-xl font-extrabold active:scale-95"
              >
                再開
              </button>
            </>
          )}
          {st.status === "finished" && (
            <button
              onClick={st.reset}
              className="h-16 w-48 rounded-full bg-red-500 text-xl font-extrabold active:scale-95"
            >
              停止
            </button>
          )}
        </div>
        {(st.status === "running" || st.status === "paused") && (
          <div className="mt-3 text-center">
            <button onClick={st.skip} className="text-sm font-bold text-muted underline-offset-4 active:underline">
              スキップ
            </button>
          </div>
        )}

        <section className={cx("mt-8 rounded-2xl bg-card p-4", !idle && "opacity-50")}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">秒数を設定</h2>
            {!idle && <span className="text-[11px] text-muted">待機中に変更できます</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={!idle}
              onClick={() => commit(st.userSeconds - 10)}
              className="h-12 w-14 rounded-xl bg-card2 font-bold"
            >
              −10
            </button>
            <div className="relative flex-1">
              <input
                type="number"
                inputMode="numeric"
                disabled={!idle}
                value={draft}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commit(Number(draft) || st.userSeconds)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="h-12 w-full rounded-xl border border-line bg-card2 pr-10 text-center text-2xl font-extrabold tabular-nums outline-none focus:border-accent"
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">秒</span>
            </div>
            <button
              disabled={!idle}
              onClick={() => commit(st.userSeconds + 10)}
              className="h-12 w-14 rounded-xl bg-card2 font-bold"
            >
              ＋10
            </button>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {TIMER_PRESETS.map((p) => (
              <button
                key={p}
                disabled={!idle}
                onClick={() => commit(p)}
                className={cx(
                  "h-10 rounded-xl text-sm font-bold",
                  st.userSeconds === p ? "bg-accent text-white" : "bg-card2 text-white/80",
                )}
              >
                {p}秒
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">設定した秒数は次回利用時も保持されます。</p>
        </section>

        {perm !== "granted" && perm !== "unsupported" && (
          <section className="mt-3 flex items-center gap-3 rounded-2xl bg-card p-4">
            <span className="text-2xl">🔔</span>
            <div className="flex-1 text-xs text-muted">
              通知を許可すると、別画面を表示中でもタイマー終了をお知らせします。
            </div>
            <button
              onClick={async () => {
                const r = await requestNotificationPermission();
                setPerm(r);
                if (r === "granted") toast("通知を許可しました", undefined, "🔔");
              }}
              className="h-9 shrink-0 rounded-lg bg-accent px-3 text-xs font-bold"
            >
              許可する
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
