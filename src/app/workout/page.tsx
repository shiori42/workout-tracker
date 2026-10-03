"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import type { SessionExercise, WorkoutSession } from "@/lib/types";
import { useTimer } from "@/lib/timerStore";
import {
  bodyWeightAt,
  computeBadges,
  estimate1RM,
  nextTarget,
  personalRecord,
  planFor,
  sessionDurationMinutes,
  sessionKcal,
  sessionTotals,
} from "@/lib/calc";
import { BODY_PARTS, EQUIPMENT, WEIGHT_MODES } from "@/lib/constants";
import { fmtClock, fmtMinutes, ymd } from "@/lib/date";
import { toast } from "@/lib/toast";
import { useNow } from "@/components/hooks";
import {
  Badge,
  Button,
  Card,
  Empty,
  LinkButton,
  NumberInput,
  PageHeader,
  ProgressBar,
  Sheet,
  TextArea,
  cx,
} from "@/components/ui";
import { FormGuideSheet, guideFor } from "@/components/FormGuide";
import {
  CheckIcon,
  DownIcon,
  PlusIcon,
  TrashIcon,
  UpIcon,
} from "@/components/Icons";

export default function WorkoutPage() {
  const activeId = useApp((s) => s.activeSessionId);
  const session = useApp((s) => s.sessions.find((x) => x.id === s.activeSessionId));
  const [finishedId, setFinishedId] = useState<string | null>(null);

  if (finishedId) return <FinishedView sessionId={finishedId} />;
  if (activeId && session) return <SessionView session={session} onFinished={setFinishedId} />;
  return <StartView />;
}

/* ---------------- 開始前：本日のメニュー選択 ---------------- */

function StartView() {
  const data = useApp();
  const router = useRouter();
  const today = ymd();
  const plan = planFor(data, today);
  const planned = plan && plan !== "rest" ? data.templates.find((t) => t.id === plan) : undefined;
  const todaySessions = data.sessions.filter((s) => s.date === today && s.completed);
  const w = bodyWeightAt(data.bodyRecords, today);

  const start = (templateId: string | null) => {
    data.startSession(templateId, today);
    window.scrollTo({ top: 0 });
  };

  const exName = (id: string) => data.exercises.find((e) => e.id === id);

  if (data.templates.length === 0 && data.exercises.length === 0) {
    return (
      <div>
        <PageHeader title="本日のトレーニング" back="/" />
        <div className="space-y-4 px-4 pt-6">
          <Empty>
            <div className="mb-2 text-4xl">📝</div>
            <div className="font-bold text-white">メニューがまだ登録されていません</div>
            <div className="mt-1">種目とテンプレートを作成して、トレーニングを始めましょう。</div>
          </Empty>
          <LinkButton href="/menu" size="lg" className="w-full">
            メニューを作成する
          </LinkButton>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              data.loadSamples();
              toast("サンプルメニューを追加しました", "曜日別スケジュールも設定済みです", "✨");
            }}
          >
            サンプルメニューを追加
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="本日のトレーニング" back="/" />
      <div className="space-y-4 px-4 pt-4">
        {todaySessions.length > 0 && (
          <Card title="今日の実施済みトレーニング">
            <ul className="space-y-2">
              {todaySessions.map((s) => {
                const t = sessionTotals(s);
                return (
                  <li key={s.id} className="flex items-center justify-between rounded-xl bg-card2 px-3 py-2 text-sm">
                    <span className="font-bold">✅ {s.templateName}</span>
                    <span className="text-xs text-muted">
                      {t.sets}セット ・ {sessionKcal(s, w)}kcal
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {plan === "rest" && (
          <Card>
            <div className="text-center">
              <div className="text-4xl">🛌</div>
              <div className="mt-2 font-bold">今日は休養日です</div>
              <p className="mt-1 text-xs text-muted">
                計画どおり休むことも大切なトレーニングです。動きたい場合は下からメニューを選べます。
              </p>
            </div>
          </Card>
        )}

        {planned && (
          <Card
            title={
              <span className="flex items-center gap-2">
                今日の予定 <Badge color="accent">{planned.name}</Badge>
              </span>
            }
          >
            <ul className="mb-4 space-y-2">
              {planned.exerciseIds.map((id, i) => {
                const e = exName(id);
                if (!e) return null;
                return (
                  <li key={id} className="flex items-center gap-3 rounded-xl bg-card2 px-3 py-2.5">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold">{e.name}</span>
                      <span className="block text-[11px] text-muted">
                        {BODY_PARTS[e.bodyPart]} ・ {EQUIPMENT[e.equipment]} ・ 休憩{e.restSec}秒
                      </span>
                    </span>
                    <span className="text-xs text-muted tabular-nums">
                      {e.defaultWeight > 0 ? `${e.defaultWeight}kg×` : ""}
                      {e.defaultReps}回×{e.defaultSets}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Button size="lg" className="w-full" onClick={() => start(planned.id)}>
              このメニューで開始
            </Button>
          </Card>
        )}

        {!plan && (
          <Card>
            <div className="text-center text-sm">
              <div className="font-bold">今日の予定メニューは未設定です</div>
              <p className="mt-1 text-xs text-muted">下のテンプレートから選ぶか、曜日別スケジュールを設定しましょう。</p>
              <Link href="/menu?tab=schedule" className="mt-2 inline-block text-xs font-bold text-accent">
                曜日別スケジュールを設定 ›
              </Link>
            </div>
          </Card>
        )}

        <Card title={planned ? "別のメニューで開始" : "メニューを選んで開始"}>
          {data.templates.length === 0 ? (
            <Empty>
              テンプレートがありません。
              <Link href="/menu?tab=templates" className="ml-1 font-bold text-accent">
                作成する
              </Link>
            </Empty>
          ) : (
            <ul className="space-y-2">
              {data.templates
                .filter((t) => t.id !== planned?.id)
                .map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => start(t.id)}
                      className="flex w-full items-center gap-3 rounded-xl bg-card2 px-3 py-3 text-left active:bg-line"
                    >
                      <span className="flex-1">
                        <span className="block text-sm font-bold">{t.name}</span>
                        <span className="block truncate text-[11px] text-muted">
                          {t.exerciseIds.map((id) => exName(id)?.name).filter(Boolean).join("・") || "種目なし"}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-accent">開始</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
          <Button variant="secondary" className="mt-3 w-full" onClick={() => start(null)}>
            <PlusIcon size={16} /> フリートレーニングで開始
          </Button>
          <button onClick={() => router.push("/menu")} className="mt-3 block w-full text-center text-xs font-bold text-muted">
            メニュー管理を開く ›
          </button>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- 実施中 ---------------- */

function SessionView({
  session,
  onFinished,
}: {
  session: WorkoutSession;
  onFinished: (id: string) => void;
}) {
  const data = useApp();
  const startTimer = useTimer((s) => s.start);
  const now = useNow(true, 1000);
  const totals = sessionTotals(session);
  const progress = totals.plannedSets > 0 ? totals.sets / totals.plannedSets : 0;
  const [addOpen, setAddOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const autoOpened = useRef(false);

  useEffect(() => {
    if (progress >= 1 && totals.plannedSets > 0 && !autoOpened.current) {
      autoOpened.current = true;
      const id = setTimeout(() => setFinishOpen(true), 400);
      return () => clearTimeout(id);
    }
    if (progress < 1) autoOpened.current = false;
  }, [progress, totals.plannedSets]);

  const toggleSet = (ex: SessionExercise, i: number) => {
    const set = ex.sets[i];
    const willDone = !set.done;
    data.updateSet(session.id, ex.uid, i, { done: willDone });
    if (willDone) {
      const pr = personalRecord(data.sessions, ex.exerciseId, session.id);
      const doneInSession = ex.sets.filter((x, j) => x.done && j !== i);
      const sessionBest1RM = Math.max(0, ...doneInSession.map((x) => estimate1RM(x.weight, x.reps)));
      const sessionBestReps = Math.max(0, ...doneInSession.map((x) => x.reps));
      const rm = estimate1RM(set.weight, set.reps);
      if (rm > 0 && pr.best1RM > 0 && rm > pr.best1RM && rm > sessionBest1RM) {
        toast("自己ベスト更新！", `${ex.name} 推定1RM ${rm}kg（前回まで ${pr.best1RM}kg）`, "🏅");
      } else if (set.weight === 0 && pr.bestReps > 0 && pr.bestWeight === 0 && set.reps > pr.bestReps && set.reps > sessionBestReps) {
        toast("自己ベスト更新！", `${ex.name} ${set.reps}回（前回まで ${pr.bestReps}回）`, "🏅");
      }
      const isLastOfAll =
        totals.sets + 1 >= totals.plannedSets &&
        session.exercises.every((e) => e.sets.every((s, j) => s.done || (e.uid === ex.uid && j === i)));
      if (!isLastOfAll && ex.restSec > 0) {
        startTimer(ex.restSec, `${ex.name} ${i + 1}セット目 完了`);
      }
    }
  };

  return (
    <div>
      <PageHeader
        title={session.templateName ?? "トレーニング"}
        back="/"
        right={
          <button onClick={() => setDiscardOpen(true)} aria-label="破棄" className="grid h-10 w-10 place-items-center text-muted">
            <TrashIcon size={20} />
          </button>
        }
      />
      <div className="sticky top-14 z-10 border-b border-line/60 bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold">
            <span className="text-lg text-accent tabular-nums">{totals.doneExercises}</span>/{totals.exercises}種目
            <span className="mx-2 text-line">|</span>
            <span className="text-lg text-accent tabular-nums">{totals.sets}</span>/{totals.plannedSets}セット
          </span>
          <span className="text-muted tabular-nums">経過 {fmtClock((now - session.startAt) / 1000)}</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      <div className="space-y-3 px-4 pt-3">
        {session.exercises.length === 0 && (
          <Empty>種目がありません。下の「種目を追加」から追加してください。</Empty>
        )}
        {session.exercises.map((ex, idx) => (
          <ExerciseCard
            key={ex.uid}
            ex={ex}
            index={idx}
            count={session.exercises.length}
            sessionId={session.id}
            onToggle={(i) => toggleSet(ex, i)}
          />
        ))}

        <Button variant="secondary" className="w-full" onClick={() => setAddOpen(true)}>
          <PlusIcon size={16} /> 種目を追加
        </Button>

        <Button
          size="lg"
          className="w-full"
          disabled={totals.sets === 0}
          onClick={() => setFinishOpen(true)}
        >
          トレーニングを完了
        </Button>
        <p className="pb-2 text-center text-[11px] text-muted">
          入力内容は端末に自動保存されます。タブを移動しても失われません。
        </p>
      </div>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="種目を追加">
        {data.exercises.length === 0 ? (
          <Empty>
            種目が登録されていません。
            <Link href="/menu" className="ml-1 font-bold text-accent">
              作成する
            </Link>
          </Empty>
        ) : (
          <ul className="space-y-2">
            {data.exercises.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => {
                    data.addExerciseToSession(session.id, e.id);
                    setAddOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-card2 px-3 py-3 text-left active:bg-line"
                >
                  <span>
                    <span className="block text-sm font-bold">{e.name}</span>
                    <span className="text-[11px] text-muted">
                      {BODY_PARTS[e.bodyPart]} ・ {EQUIPMENT[e.equipment]}
                    </span>
                  </span>
                  <PlusIcon size={18} className="text-accent" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <FinishSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        session={session}
        onDone={() => {
          setFinishOpen(false);
          onFinished(session.id);
        }}
      />

      <Sheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="記録を破棄しますか？"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                data.discardSession(session.id);
                setDiscardOpen(false);
              }}
            >
              破棄する
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">このトレーニングの入力内容はすべて削除されます。</p>
      </Sheet>
    </div>
  );
}

function ExerciseCard({
  ex,
  index,
  count,
  sessionId,
  onToggle,
}: {
  ex: SessionExercise;
  index: number;
  count: number;
  sessionId: string;
  onToggle: (i: number) => void;
}) {
  const data = useApp();
  const [memoOpen, setMemoOpen] = useState(!!ex.memo);
  const [guideOpen, setGuideOpen] = useState(false);
  const master = data.exercises.find((e) => e.id === ex.exerciseId);
  const guideTarget = master ?? ex;
  const doneCount = ex.sets.filter((s) => s.done).length;
  const complete = ex.sets.length > 0 && doneCount === ex.sets.length;
  const first = ex.sets[0];
  const suggestion = nextTarget(data.sessions, ex, sessionId);
  const weightLabel = ex.weightMode === "per_hand" ? "kg/片手" : ex.weightMode === "left_right" ? "kg/片側" : "kg";

  return (
    <section className={cx("rounded-2xl border bg-card p-4 transition", complete ? "border-ok/40" : "border-transparent")}>
      <div className="flex items-start gap-2">
        <span
          className={cx(
            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
            complete ? "bg-ok text-black" : "bg-accent/20 text-accent",
          )}
        >
          {complete ? <CheckIcon size={14} /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold">{ex.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge color="accent">{BODY_PARTS[ex.bodyPart]}</Badge>
            <Badge>{EQUIPMENT[ex.equipment]}</Badge>
            {ex.equipment !== "bodyweight" && <Badge>{WEIGHT_MODES[ex.weightMode]}</Badge>}
            <Badge>休憩 {ex.restSec}秒</Badge>
          </div>
          {first && (
            <div className="mt-1.5 text-[11px] text-muted">
              目標：{first.weight > 0 ? `${first.weight}kg × ` : ""}
              {first.reps}回 × {ex.sets.length}セット
            </div>
          )}
          {suggestion && doneCount === 0 && (
            <div className="mt-1 text-[11px] leading-snug text-accent">
              💡 前回 {suggestion.prev} → {suggestion.text}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <button
            aria-label="上へ"
            disabled={index === 0}
            onClick={() => data.moveSessionExercise(sessionId, ex.uid, -1)}
            className="grid h-7 w-7 place-items-center text-muted disabled:opacity-20"
          >
            <UpIcon size={16} />
          </button>
          <button
            aria-label="下へ"
            disabled={index === count - 1}
            onClick={() => data.moveSessionExercise(sessionId, ex.uid, 1)}
            className="grid h-7 w-7 place-items-center text-muted disabled:opacity-20"
          >
            <DownIcon size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[28px_1fr_1fr_52px] items-center gap-2 px-0.5 text-[10px] font-bold text-muted">
        <span className="text-center">SET</span>
        <span className="text-center">重量（{weightLabel}）</span>
        <span className="text-center">回数</span>
        <span className="text-center">完了</span>
      </div>
      <ul className="mt-1 space-y-1.5">
        {ex.sets.map((s, i) => (
          <li
            key={i}
            className={cx(
              "grid grid-cols-[28px_1fr_1fr_52px] items-center gap-2 rounded-xl p-0.5 transition",
              s.done && "bg-ok/10",
            )}
          >
            <span className={cx("text-center text-sm font-extrabold", s.done ? "text-ok" : "text-muted")}>{i + 1}</span>
            <NumberInput
              value={s.weight}
              step={0.5}
              onChange={(v) => data.updateSet(sessionId, ex.uid, i, { weight: v })}
              className="h-11 text-center text-lg font-bold tabular-nums"
              aria-label={`${i + 1}セット目 重量`}
            />
            <NumberInput
              value={s.reps}
              onChange={(v) => data.updateSet(sessionId, ex.uid, i, { reps: Math.round(v) })}
              className="h-11 text-center text-lg font-bold tabular-nums"
              inputMode="numeric"
              aria-label={`${i + 1}セット目 回数`}
            />
            <button
              onClick={() => onToggle(i)}
              aria-label={`${i + 1}セット目 完了`}
              className={cx(
                "grid h-11 w-full place-items-center rounded-xl transition active:scale-90",
                s.done ? "bg-ok text-black" : "border-2 border-line text-muted",
              )}
            >
              <CheckIcon size={20} />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => data.addSet(sessionId, ex.uid)}>
          <PlusIcon size={14} /> セット追加
        </Button>
        {ex.sets.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => data.removeSet(sessionId, ex.uid, ex.sets.length - 1)}
          >
            1セット削除
          </Button>
        )}
        <div className="ml-auto flex gap-1">
          {guideFor(guideTarget) && (
            <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)}>
              フォーム
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setMemoOpen((v) => !v)}>
            メモ
          </Button>
          <button
            aria-label="種目を削除"
            onClick={() => data.removeExerciseFromSession(sessionId, ex.uid)}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted active:bg-card2"
          >
            <TrashIcon size={16} />
          </button>
        </div>
      </div>
      {memoOpen && (
        <TextArea
          className="mt-2"
          rows={2}
          placeholder="フォーム、負荷、痛み、次回目標など"
          value={ex.memo}
          onChange={(e) => data.updateSessionExercise(sessionId, ex.uid, { memo: e.target.value })}
        />
      )}
      <FormGuideSheet exercise={guideOpen ? guideTarget : null} onClose={() => setGuideOpen(false)} />
    </section>
  );
}

function FinishSheet({
  open,
  onClose,
  session,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  session: WorkoutSession;
  onDone: () => void;
}) {
  const data = useApp();
  const now = useNow(open, 5000);
  const w = bodyWeightAt(data.bodyRecords, session.date);
  const preview: WorkoutSession = { ...session, completed: true, endAt: now, kcalOverride: undefined };
  const estimated = sessionKcal(preview, w);
  const minutes = sessionDurationMinutes(preview);
  const totals = sessionTotals(session);
  const [kcalText, setKcalText] = useState<string | null>(null);
  const [note, setNote] = useState(session.note);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="トレーニングを完了"
      footer={
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            const before = new Set(computeBadges(data).filter((b) => b.achieved).map((b) => b.id));
            const manual = kcalText !== null && kcalText !== "" ? Math.max(0, Math.round(Number(kcalText))) : undefined;
            data.finishSession(session.id, {
              note,
              kcalOverride: manual !== undefined && manual !== estimated ? manual : undefined,
            });
            const after = computeBadges(useApp.getState()).filter((b) => b.achieved && !before.has(b.id));
            toast("スタンプを獲得しました！", "今日のトレーニング完了", "💪");
            after.forEach((b, i) => setTimeout(() => toast(`バッジ獲得：${b.title}`, b.desc, b.icon), 600 * (i + 1)));
            onDone();
          }}
        >
          保存して完了
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card2 p-3 text-center">
          <div className="text-[11px] text-muted">実施時間</div>
          <div className="mt-1 text-lg font-extrabold">{fmtMinutes(minutes)}</div>
        </div>
        <div className="rounded-xl bg-card2 p-3 text-center">
          <div className="text-[11px] text-muted">総セット</div>
          <div className="mt-1 text-lg font-extrabold">{totals.sets}</div>
        </div>
        <div className="rounded-xl bg-card2 p-3 text-center">
          <div className="text-[11px] text-muted">総回数</div>
          <div className="mt-1 text-lg font-extrabold">{totals.reps}</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center gap-2 text-xs font-bold text-muted">
          推定消費カロリー <Badge color="warn">概算</Badge>
        </div>
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            value={kcalText ?? String(estimated)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setKcalText(e.target.value)}
            className="h-14 w-full rounded-xl border border-line bg-card2 pr-14 pl-4 text-2xl font-extrabold tabular-nums outline-none focus:border-accent"
          />
          <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted">kcal</span>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          METs × 3.5 × 体重({w}kg) ÷ 200 × 時間 で算出。必要に応じて修正できます。
        </p>
      </div>
      <div className="mt-4">
        <div className="mb-1 text-xs font-bold text-muted">メモ</div>
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="今日の調子、気づきなど" rows={2} />
      </div>
      {totals.sets < totals.plannedSets && (
        <p className="mt-3 rounded-xl bg-yellow-400/10 px-3 py-2 text-xs text-yellow-200">
          未完了のセットが {totals.plannedSets - totals.sets} 件あります。完了したセットのみ記録されます。
        </p>
      )}
    </Sheet>
  );
}

/* ---------------- 完了画面 ---------------- */

function FinishedView({ sessionId }: { sessionId: string }) {
  const data = useApp();
  const s = data.sessions.find((x) => x.id === sessionId);
  const w = bodyWeightAt(data.bodyRecords, s?.date);
  if (!s) return null;
  const stats = sessionTotals(s);
  return (
    <div className="flex min-h-[calc(100dvh-100px)] flex-col items-center justify-center px-6 text-center">
      <div className="grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-accent to-accent2 text-6xl shadow-[0_20px_60px_-12px] shadow-accent/70 animate-pop">
        💪
      </div>
      <h1 className="mt-6 text-2xl font-extrabold">お疲れさまでした！</h1>
      <p className="mt-1 text-sm text-muted">スタンプを獲得し、カレンダーに記録しました</p>
      <div className="mt-6 grid w-full grid-cols-3 gap-2">
        <div className="rounded-2xl bg-card p-3">
          <div className="text-[11px] text-muted">消費(概算)</div>
          <div className="mt-1 text-xl font-extrabold">{sessionKcal(s, w)}</div>
          <div className="text-[10px] text-muted">kcal</div>
        </div>
        <div className="rounded-2xl bg-card p-3">
          <div className="text-[11px] text-muted">実施時間</div>
          <div className="mt-1 text-xl font-extrabold">{Math.round(sessionDurationMinutes(s))}</div>
          <div className="text-[10px] text-muted">分</div>
        </div>
        <div className="rounded-2xl bg-card p-3">
          <div className="text-[11px] text-muted">総セット</div>
          <div className="mt-1 text-xl font-extrabold">{stats.sets}</div>
          <div className="text-[10px] text-muted">セット</div>
        </div>
      </div>
      <div className="mt-8 grid w-full gap-2">
        <LinkButton href="/" size="lg">
          ホームへ
        </LinkButton>
        <LinkButton href="/calendar" variant="secondary">
          カレンダーで確認
        </LinkButton>
      </div>
    </div>
  );
}
