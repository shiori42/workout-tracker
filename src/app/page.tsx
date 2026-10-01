"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import {
  currentStreak,
  dayBurn,
  dayIntake,
  isAchieved,
  monthStats,
  planFor,
  workoutDates,
} from "@/lib/calc";
import { addDays, fmtDateLong, monthOf, weekdayOf, weekKey, WEEKDAYS, ymd } from "@/lib/date";
import { CalendarIcon, DumbbellIcon, FoodIcon, ChevronRight } from "@/components/Icons";
import { Card, ProgressBar, cx } from "@/components/ui";

export default function HomePage() {
  const data = useApp();
  const router = useRouter();
  const today = ymd();
  const streak = currentStreak(data, today);
  const burn = dayBurn(data, today);
  const intake = dayIntake(data, today);
  const plan = planFor(data, today);
  const planTemplate = plan && plan !== "rest" ? data.templates.find((t) => t.id === plan) : undefined;
  const active = data.sessions.find((s) => s.id === data.activeSessionId);
  const doneToday = data.stamps.some((s) => s.date === today);
  const ms = monthStats(data, monthOf(today), today);
  const wd = workoutDates(data);
  const weekStart = weekKey(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const planLabel = active
    ? `${active.templateName} を実施中`
    : doneToday
      ? "今日のトレーニングは完了しました 🎉"
      : plan === "rest"
        ? "今日は休養日です"
        : planTemplate
          ? `今日のメニュー：${planTemplate.name}`
          : "今日のメニューは未設定です";

  return (
    <div className="px-4">
      <header className="flex h-16 items-center justify-between pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2">
          <span className="text-lg leading-none">🔥</span>
          <span className="text-xs font-bold text-muted">連続</span>
          <span className="text-lg font-extrabold tabular-nums">{streak}</span>
          <span className="text-xs font-bold">日</span>
        </div>
        <Link
          href="/calendar"
          aria-label="カレンダー"
          className="grid h-11 w-11 place-items-center rounded-full bg-card text-white active:bg-card2"
        >
          <CalendarIcon size={22} />
        </Link>
      </header>

      <section className="flex min-h-[calc(100dvh-64px-88px-120px)] flex-col items-center justify-center py-6">
        <p className="text-xs font-bold text-muted">{fmtDateLong(today)}</p>
        <p className="mt-1 mb-7 text-sm font-bold text-white/90">{planLabel}</p>

        <button
          onClick={() => router.push("/workout")}
          className="group relative grid h-56 w-56 place-items-center rounded-full bg-gradient-to-br from-accent to-accent2 shadow-[0_20px_60px_-12px] shadow-accent/70 transition active:scale-95"
        >
          <span className="absolute inset-0 rounded-full bg-accent/40 blur-2xl" />
          <span className="absolute -inset-3 rounded-full border-2 border-accent/25" />
          <span className="relative flex flex-col items-center gap-2 text-white">
            <DumbbellIcon size={44} />
            <span className="text-2xl font-extrabold tracking-wide">
              {active ? "トレーニング再開" : "筋トレを開始"}
            </span>
          </span>
        </button>

        <div className="mt-9 w-full rounded-2xl bg-card px-5 py-4 text-center">
          <div className="text-xs font-bold text-muted">本日の消費カロリー（概算）</div>
          <div className="mt-1 flex items-baseline justify-center gap-1.5">
            <span className="text-4xl font-extrabold tabular-nums">{Math.round(burn.total)}</span>
            <span className="text-sm font-bold text-muted">kcal</span>
          </div>
          {burn.extra > 0 && (
            <div className="mt-1 text-[11px] text-muted">
              筋トレ {Math.round(burn.training)} kcal ＋ その他運動 {burn.extra} kcal
            </div>
          )}
        </div>
      </section>

      <div className="space-y-3 pb-4">
        <Card
          title="今月のスタンプ"
          action={<span className="text-xs font-bold text-muted">目標 {ms.goal}回</span>}
        >
          <div className="mb-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tabular-nums">{ms.trainingDays}</span>
            <span className="text-sm text-muted">/ {ms.goal} 回</span>
            <span className="ml-auto text-sm font-bold text-accent">{Math.round(ms.goalRate * 100)}%</span>
          </div>
          <ProgressBar value={ms.goalRate} />
          <div className="mt-3 grid grid-cols-8 gap-1.5">
            {Array.from({ length: Math.max(ms.goal, ms.trainingDays) }, (_, i) => (
              <div
                key={i}
                className={cx(
                  "grid aspect-square place-items-center rounded-full text-sm",
                  i < ms.trainingDays ? "bg-accent/20" : "border border-dashed border-line",
                )}
              >
                {i < ms.trainingDays ? "💪" : ""}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {week.map((d) => {
              const achieved = isAchieved(data, d, wd);
              const trained = wd.has(d);
              return (
                <div key={d} className="flex flex-col items-center gap-1">
                  <span className={cx("text-[10px] font-bold", d === today ? "text-accent" : "text-muted")}>
                    {WEEKDAYS[weekdayOf(d)]}
                  </span>
                  <span
                    className={cx(
                      "grid h-8 w-8 place-items-center rounded-full text-xs",
                      trained ? "bg-accent text-white" : achieved && d <= today ? "bg-card2 text-muted" : "bg-card2/40 text-muted/50",
                      d === today && "ring-2 ring-accent/60",
                    )}
                  >
                    {trained ? "✓" : achieved && d <= today ? "休" : Number(d.slice(8))}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Link href="/meals" className="block">
          <Card
            title={
              <span className="flex items-center gap-2">
                <FoodIcon size={16} className="text-accent" />
                今日の食事・カロリー収支
              </span>
            }
            action={<ChevronRight size={18} className="text-muted" />}
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[11px] text-muted">摂取</div>
                <div className="text-lg font-extrabold tabular-nums">{intake}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted">消費</div>
                <div className="text-lg font-extrabold tabular-nums">{Math.round(burn.total)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted">収支</div>
                <div className="text-lg font-extrabold tabular-nums text-accent2">
                  {intake - Math.round(burn.total) > 0 ? "+" : ""}
                  {intake - Math.round(burn.total)}
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted">
              {data.meals.filter((m) => m.date === today).length}件の食事を記録 ・ タップで記録する
            </p>
          </Card>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/menu" className="rounded-2xl bg-card p-4 active:bg-card2">
            <DumbbellIcon className="text-accent" />
            <div className="mt-2 text-sm font-bold">メニュー管理</div>
            <div className="text-[11px] text-muted">{data.exercises.length}種目・{data.templates.length}テンプレート</div>
          </Link>
          <Link href="/calendar" className="rounded-2xl bg-card p-4 active:bg-card2">
            <CalendarIcon className="text-accent" />
            <div className="mt-2 text-sm font-bold">カレンダー</div>
            <div className="text-[11px] text-muted">予定と履歴を確認</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
