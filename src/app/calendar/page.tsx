"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/lib/store";
import {
  bodyWeightAt,
  calcBmi,
  dayBurn,
  dayIntake,
  fmtSet,
  monthStats,
  planFor,
  sessionDurationMinutes,
  sessionKcal,
  sessionTotals,
} from "@/lib/calc";
import { MEAL_TYPES } from "@/lib/constants";
import {
  addMonths,
  daysInMonth,
  fmtDateLong,
  fmtMinutes,
  fmtMonth,
  monthOf,
  pad,
  WEEKDAYS,
  weekdayOf,
  ymd,
} from "@/lib/date";
import { Badge, Card, PageHeader, Select, Sheet, cx } from "@/components/ui";
import { ChevronLeft, ChevronRight } from "@/components/Icons";

export default function CalendarPage() {
  const data = useApp();
  const today = ymd();
  const [month, setMonth] = useState(monthOf(today));
  const [selected, setSelected] = useState<string | null>(null);
  const ms = monthStats(data, month, today);

  const first = `${month}-01`;
  const lead = weekdayOf(first);
  const total = daysInMonth(month);
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const trained = new Set(data.sessions.filter((s) => s.completed).map((s) => s.date));
  const bodyDates = new Set(data.bodyRecords.map((r) => r.date));
  const photoDates = new Set(data.bodyRecords.filter((r) => r.photos.length > 0).map((r) => r.date));
  const mealDates = new Set(data.meals.map((m) => m.date));

  return (
    <div>
      <PageHeader title="カレンダー" back="/" />
      <div className="space-y-3 px-4 pt-3">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <button
              aria-label="前の月"
              onClick={() => setMonth(addMonths(month, -1))}
              className="grid h-9 w-9 place-items-center rounded-full bg-card2"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <div className="text-base font-extrabold">{fmtMonth(month)}</div>
              {month !== monthOf(today) && (
                <button onClick={() => setMonth(monthOf(today))} className="text-[11px] font-bold text-accent">
                  今月に戻る
                </button>
              )}
            </div>
            <button
              aria-label="次の月"
              onClick={() => setMonth(addMonths(month, 1))}
              className="grid h-9 w-9 place-items-center rounded-full bg-card2"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={cx("pb-1", i === 0 ? "text-red-400" : i === 6 ? "text-sky-400" : "text-muted")}>
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const plan = planFor(data, d);
              const isTrained = trained.has(d);
              const isPast = d < today;
              const isRest = plan === "rest";
              const missed = isPast && d >= data.settings.startDate && !isTrained && !!plan && !isRest;
              const futurePlan = d >= today && !isTrained && !!plan && !isRest;
              return (
                <button
                  key={d}
                  onClick={() => setSelected(d)}
                  className={cx(
                    "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold transition active:scale-95",
                    isTrained && "bg-accent text-white",
                    !isTrained && isRest && d <= today && "bg-card2 text-muted",
                    !isTrained && !isRest && "bg-card2/40",
                    futurePlan && "ring-1 ring-accent/60 ring-inset",
                    d === today && "outline-2 outline-offset-1 outline-white",
                  )}
                >
                  <span className="tabular-nums">{Number(d.slice(8))}</span>
                  <span className="h-3 text-[9px] leading-3">
                    {isTrained ? "💪" : isRest ? "休" : missed ? <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" /> : ""}
                  </span>
                  <span className="absolute top-0.5 right-0.5 flex gap-0.5">
                    {photoDates.has(d) ? (
                      <span className="text-[8px]">📷</span>
                    ) : bodyDates.has(d) ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    ) : null}
                    {mealDates.has(d) && <span className="h-1.5 w-1.5 rounded-full bg-ok" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-accent" />実施（スタンプ）</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-card2 text-center text-[8px] leading-3">休</span>休養日</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />未実施</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded ring-1 ring-accent/60 ring-inset" />予定</span>
            <span className="flex items-center gap-1">📷身体写真</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" />身体記録</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-ok" />食事記録</span>
          </div>
        </Card>

        <Card title={`${fmtMonth(month)}のまとめ`}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-card2 p-2">
              <div className="text-[10px] text-muted">実施日数</div>
              <div className="text-lg font-extrabold">{ms.trainingDays}<span className="text-xs text-muted">/{ms.goal}</span></div>
            </div>
            <div className="rounded-xl bg-card2 p-2">
              <div className="text-[10px] text-muted">総セット</div>
              <div className="text-lg font-extrabold">{ms.totalSets}</div>
            </div>
            <div className="rounded-xl bg-card2 p-2">
              <div className="text-[10px] text-muted">消費kcal</div>
              <div className="text-lg font-extrabold">{Math.round(ms.kcal)}</div>
            </div>
          </div>
        </Card>
      </div>

      <DaySheet date={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function DaySheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const data = useApp();
  if (!date) return null;
  const today = ymd();
  const sessions = data.sessions.filter((s) => s.date === date && s.completed);
  const meals = data.meals.filter((m) => m.date === date);
  const burn = dayBurn(data, date);
  const intake = dayIntake(data, date);
  const body = data.bodyRecords.filter((r) => r.date === date);
  const w = bodyWeightAt(data.bodyRecords, date);
  const plan = planFor(data, date);
  const assigned = data.dateAssignments[date];
  const stamp = data.stamps.find((s) => s.date === date);

  const planOptions = [
    { value: "__default", label: "曜日スケジュールに従う" },
    { value: "none", label: "予定なし" },
    { value: "rest", label: "🛌 休養日" },
    ...data.templates.map((t) => ({ value: t.id, label: t.name })),
  ];

  return (
    <Sheet open onClose={onClose} title={fmtDateLong(date)}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {stamp && <Badge color="accent">💪 スタンプ獲得</Badge>}
          {plan === "rest" && <Badge>🛌 休養日</Badge>}
          {plan && plan !== "rest" && <Badge color="ok">予定：{data.templates.find((t) => t.id === plan)?.name}</Badge>}
          {body.some((b) => b.photos.length > 0) && <Badge>📷 写真登録</Badge>}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-card2 p-2">
            <div className="text-[10px] text-muted">摂取</div>
            <div className="text-lg font-extrabold">{intake}</div>
          </div>
          <div className="rounded-xl bg-card2 p-2">
            <div className="text-[10px] text-muted">消費(概算)</div>
            <div className="text-lg font-extrabold">{Math.round(burn.total)}</div>
          </div>
          <div className="rounded-xl bg-card2 p-2">
            <div className="text-[10px] text-muted">収支</div>
            <div className="text-lg font-extrabold text-accent2">{intake - Math.round(burn.total)}</div>
          </div>
        </div>

        <section>
          <h4 className="mb-2 text-xs font-bold text-muted">トレーニング</h4>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted">記録なし</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const t = sessionTotals(s);
                return (
                  <div key={s.id} className="rounded-xl bg-card2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{s.templateName}</span>
                      <span className="text-xs text-muted">
                        {fmtMinutes(sessionDurationMinutes(s))} ・ {sessionKcal(s, w)}kcal
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {s.exercises
                        .filter((e) => e.sets.some((x) => x.done))
                        .map((e) => (
                          <li key={e.uid} className="text-xs">
                            <span className="font-bold text-white/90">{e.name}</span>
                            <span className="ml-2 text-muted tabular-nums">
                              {e.sets
                                .filter((x) => x.done)
                                .map((x) => fmtSet(e, x))
                                .join(" / ")}
                            </span>
                            {e.memo && <div className="text-[11px] text-white/50">📝 {e.memo}</div>}
                          </li>
                        ))}
                    </ul>
                    <div className="mt-2 text-[11px] text-muted">
                      計 {t.sets}セット{t.reps > 0 ? `・${t.reps}回` : ""}
                      {t.seconds > 0 ? `・${t.seconds}秒` : ""}
                      {t.volume > 0 ? `・総負荷 ${Math.round(t.volume)}kg` : ""}
                    </div>
                    {s.note && <div className="mt-1 text-xs text-white/70">メモ：{s.note}</div>}
                  </div>
                );
              })}
            </div>
          )}
          {burn.extra > 0 && (
            <p className="mt-2 text-xs text-muted">その他の運動：{burn.extra}kcal</p>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold text-muted">食事</h4>
            <Link href={`/meals?date=${date}`} className="text-xs font-bold text-accent">
              記録する ›
            </Link>
          </div>
          {meals.length === 0 ? (
            <p className="text-sm text-muted">記録なし</p>
          ) : (
            <ul className="space-y-1">
              {meals.map((m) => (
                <li key={m.id} className="flex justify-between rounded-lg bg-card2 px-3 py-2 text-xs">
                  <span>
                    <span className="mr-2 text-muted">{MEAL_TYPES[m.mealType]}</span>
                    {m.foodName}
                    {m.amount && <span className="text-muted">（{m.amount}）</span>}
                  </span>
                  <span className="font-bold tabular-nums">{m.kcal}kcal</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {body.length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-bold text-muted">身体記録</h4>
            {body.map((b) => (
              <div key={b.id} className="rounded-xl bg-card2 px-3 py-2 text-sm">
                {b.heightCm}cm ・ {b.weightKg}kg ・ BMI {calcBmi(b.heightCm, b.weightKg)}
                {b.photos.length > 0 && <span className="ml-2 text-xs text-muted">写真{b.photos.length}枚</span>}
              </div>
            ))}
          </section>
        )}

        {date >= today && (
          <section>
            <h4 className="mb-2 text-xs font-bold text-muted">予定メニューを割り当て</h4>
            <Select
              value={assigned === undefined ? "__default" : assigned}
              onChange={(v) => data.setDatePlan(date, v === "__default" ? undefined : v)}
              options={planOptions}
            />
          </section>
        )}
      </div>
    </Sheet>
  );
}
