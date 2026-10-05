"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp, type ExerciseInput } from "@/lib/store";
import type {
  BodyPart,
  Equipment,
  Exercise,
  ExerciseGuide,
  Intensity,
  Muscle,
  RepUnit,
  Template,
  WeightMode,
} from "@/lib/types";
import {
  BODY_PARTS,
  EQUIPMENT,
  INTENSITY,
  MUSCLE_MAP,
  MUSCLES,
  REP_UNITS,
  TIMER_PRESETS,
  WEIGHT_MODES,
  isTimed,
  repUnitOf,
} from "@/lib/constants";
import { fmtDate, WEEKDAYS } from "@/lib/date";
import { estimate1RM, fmtSet, personalRecord, setVolume } from "@/lib/calc";
import { toast } from "@/lib/toast";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Input,
  NumberInput,
  PageHeader,
  Segmented,
  Select,
  Sheet,
  TextArea,
  cx,
} from "@/components/ui";
import {
  FormGuideSheet,
  MAIN_RATE,
  formGuideFor,
  guideFor,
  hasGuideContent,
  musclesLabel,
} from "@/components/FormGuide";
import {
  BookIcon,
  CopyIcon,
  DownIcon,
  EditIcon,
  HistoryIcon,
  PlusIcon,
  TrashIcon,
  UpIcon,
  XIcon,
} from "@/components/Icons";

type Tab = "exercises" | "templates" | "schedule";

export default function MenuPage() {
  return (
    <Suspense>
      <MenuInner />
    </Suspense>
  );
}

function MenuInner() {
  const params = useSearchParams();
  const initial = (params.get("tab") as Tab) || "exercises";
  const [tab, setTab] = useState<Tab>(initial);
  return (
    <div>
      <PageHeader title="メニュー管理" back />
      <div className="sticky top-14 z-10 bg-bg/95 px-4 py-2 backdrop-blur">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "exercises", label: "種目" },
            { value: "templates", label: "テンプレート" },
            { value: "schedule", label: "曜日スケジュール" },
          ]}
        />
      </div>
      <div className="px-4 pt-2">
        {tab === "exercises" && <ExercisesTab />}
        {tab === "templates" && <TemplatesTab />}
        {tab === "schedule" && <ScheduleTab />}
      </div>
    </div>
  );
}

/* ---------------- 種目 ---------------- */

const emptyExercise = (): ExerciseInput => ({
  name: "",
  bodyPart: "chest",
  equipment: "dumbbell",
  weightMode: "per_hand",
  defaultWeight: 0,
  defaultReps: 10,
  defaultSets: 3,
  restSec: 60,
  intensity: "moderate",
  memo: "",
});

function ExercisesTab() {
  const data = useApp();
  const [editing, setEditing] = useState<{ id?: string; value: ExerciseInput } | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [guideEx, setGuideEx] = useState<Exercise | null>(null);
  const [filter, setFilter] = useState<BodyPart | "all">("all");
  const [confirmDelete, setConfirmDelete] = useState<Exercise | null>(null);

  const list = data.exercises.filter((e) => filter === "all" || e.bodyPart === filter);

  return (
    <div className="space-y-3 pb-4">
      <Button className="w-full" onClick={() => setEditing({ value: emptyExercise() })}>
        <PlusIcon size={16} /> 種目を追加
      </Button>

      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {(["all", ...Object.keys(BODY_PARTS)] as (BodyPart | "all")[]).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cx(
              "h-8 shrink-0 rounded-full px-3 text-xs font-bold",
              filter === k ? "bg-accent text-white" : "bg-card text-muted",
            )}
          >
            {k === "all" ? "すべて" : BODY_PARTS[k]}
          </button>
        ))}
      </div>

      {data.exercises.length === 0 && (
        <Empty>
          <div>種目がまだありません。</div>
          <button
            className="mt-2 font-bold text-accent"
            onClick={() => {
              data.loadSamples();
              toast("サンプルメニューを追加しました", undefined, "✨");
            }}
          >
            サンプル種目を追加する
          </button>
        </Empty>
      )}

      <ul className="space-y-2">
        {list.map((e) => (
          <li key={e.id} className="rounded-2xl bg-card p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{e.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge color="accent">{BODY_PARTS[e.bodyPart]}</Badge>
                  <Badge>{EQUIPMENT[e.equipment]}</Badge>
                  <Badge>{INTENSITY[e.intensity]}</Badge>
                </div>
                <div className="mt-1.5 text-xs text-muted tabular-nums">
                  {e.defaultWeight > 0 ? `${e.defaultWeight}kg（${WEIGHT_MODES[e.weightMode]}）× ` : ""}
                  {`${e.defaultReps}${REP_UNITS[repUnitOf(e)]}`} × {e.defaultSets}セット ・ 休憩{e.restSec}秒
                </div>
                {!formGuideFor(e.name) && <MusclesLine exercise={e} />}
                {e.memo && <div className="mt-1 text-[11px] text-white/60">📝 {e.memo}</div>}
              </div>
            </div>
            <div className="mt-2 flex justify-end gap-1 border-t border-line/50 pt-2">
              {guideFor(e) && (
                <IconBtn label="フォーム" onClick={() => setGuideEx(e)}>
                  <BookIcon size={16} />
                </IconBtn>
              )}
              <IconBtn label="履歴" onClick={() => setHistoryId(e.id)}>
                <HistoryIcon size={16} />
              </IconBtn>
              <IconBtn label="複製" onClick={() => data.duplicateExercise(e.id)}>
                <CopyIcon size={16} />
              </IconBtn>
              <IconBtn
                label="編集"
                onClick={() => {
                  const { id, createdAt, ...rest } = e;
                  void createdAt;
                  setEditing({ id, value: rest });
                }}
              >
                <EditIcon size={16} />
              </IconBtn>
              <IconBtn label="削除" onClick={() => setConfirmDelete(e)}>
                <TrashIcon size={16} />
              </IconBtn>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <ExerciseForm
          initial={editing.value}
          isNew={!editing.id}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            if (editing.id) data.updateExercise(editing.id, v);
            else data.addExercise(v);
            setEditing(null);
            toast(editing.id ? "種目を更新しました" : "種目を追加しました", v.name, "✅");
          }}
        />
      )}

      <ExerciseHistory id={historyId} onClose={() => setHistoryId(null)} />
      <FormGuideSheet exercise={guideEx} onClose={() => setGuideEx(null)} />

      <Sheet
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="種目を削除しますか？"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) data.deleteExercise(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              削除する
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          「{confirmDelete?.name}」をテンプレートからも外します。過去のトレーニング記録は残ります。
        </p>
      </Sheet>
    </div>
  );
}

function MusclesLine({ exercise }: { exercise: Exercise }) {
  const muscles = exercise.muscles && Object.keys(exercise.muscles).length > 0 ? exercise.muscles : MUSCLE_MAP[exercise.bodyPart];
  const main = musclesLabel(muscles, true);
  const sub = musclesLabel(muscles, false);
  if (!main && !sub) return null;
  return (
    <div className="mt-1 text-[11px] text-white/60">
      🎯 主に効く：{main || "-"}
      {sub && <span className="text-muted">（補助：{sub}）</span>}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-muted active:bg-card2"
    >
      {children}
      {label}
    </button>
  );
}

function ExerciseForm({
  initial,
  isNew,
  onClose,
  onSave,
}: {
  initial: ExerciseInput;
  isNew: boolean;
  onClose: () => void;
  onSave: (v: ExerciseInput) => void;
}) {
  const [v, setV] = useState<ExerciseInput>(initial);
  const [musclesTouched, setMusclesTouched] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() => hasGuideContent(initial.guide));
  const [guide, setGuide] = useState(() => ({
    setup: initial.guide?.setup ?? "",
    movement: initial.guide?.movement ?? "",
    tips: initial.guide?.tips ?? "",
    mistakes: initial.guide?.mistakes.join("\n") ?? "",
    caution: initial.guide?.caution ?? "",
  }));
  const up = (patch: Partial<ExerciseInput>) => setV((x) => ({ ...x, ...patch }));
  const upGuide = (patch: Partial<typeof guide>) => setGuide((g) => ({ ...g, ...patch }));
  const noWeight = v.equipment === "bodyweight" || v.equipment === "abroller" || v.equipment === "handgrip";
  const muscles = v.muscles ?? MUSCLE_MAP[v.bodyPart];
  const stdGuide = formGuideFor(v.name);
  const guideValue: ExerciseGuide = {
    setup: guide.setup.trim(),
    movement: guide.movement.trim(),
    tips: guide.tips.trim(),
    mistakes: guide.mistakes.split("\n").map((s) => s.trim()).filter(Boolean),
    caution: guide.caution.trim(),
  };
  const hasMain = Object.values(muscles).some((r) => (r ?? 0) >= MAIN_RATE);

  const cycleMuscle = (m: Muscle) => {
    const r = muscles[m] ?? 0;
    const next = { ...muscles };
    if (r <= 0) next[m] = 1;
    else if (r >= MAIN_RATE) next[m] = 0.4;
    else delete next[m];
    setMusclesTouched(true);
    up({ muscles: next });
  };

  const save = () => {
    const { guide: _old, ...rest } = v;
    void _old;
    onSave({
      ...rest,
      name: v.name.trim(),
      repUnit: repUnitOf(v),
      ...(hasGuideContent(guideValue) ? { guide: guideValue } : { guide: undefined }),
    });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={isNew ? "種目を追加" : "種目を編集"}
      footer={
        <Button size="lg" className="w-full" disabled={!v.name.trim() || !hasMain} onClick={save}>
          保存
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="種目名">
          <Input value={v.name} onChange={(e) => up({ name: e.target.value })} placeholder="例：ダンベルプレス" autoFocus={isNew} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="対象部位">
            <Select
              value={v.bodyPart}
              onChange={(x) => up({ bodyPart: x as BodyPart, ...(musclesTouched ? {} : { muscles: undefined }) })}
              options={Object.entries(BODY_PARTS).map(([value, label]) => ({ value: value as BodyPart, label }))}
            />
          </Field>
          <Field label="器具">
            <Select
              value={v.equipment}
              onChange={(x) => {
                const eq = x as Equipment;
                up({
                  equipment: eq,
                  weightMode: eq === "dumbbell" ? "per_hand" : "total",
                  defaultWeight: eq === "bodyweight" || eq === "abroller" ? 0 : v.defaultWeight,
                });
              }}
              options={Object.entries(EQUIPMENT).map(([value, label]) => ({ value: value as Equipment, label }))}
            />
          </Field>
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs font-bold text-muted">効く筋肉</span>
            <span className="text-[10px] text-muted">タップで メイン → サブ → なし</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(MUSCLES) as Muscle[]).map((m) => {
              const r = muscles[m] ?? 0;
              const level = r >= MAIN_RATE ? "main" : r > 0 ? "sub" : "none";
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => cycleMuscle(m)}
                  aria-pressed={level !== "none"}
                  className={cx(
                    "h-8 rounded-full px-3 text-xs font-bold transition active:scale-95",
                    level === "main" && "bg-accent text-white",
                    level === "sub" && "border border-accent/60 bg-accent/15 text-accent",
                    level === "none" && "bg-card2 text-muted",
                  )}
                >
                  {MUSCLES[m]}
                  {level === "main" ? "・メイン" : level === "sub" ? "・サブ" : ""}
                </button>
              );
            })}
          </div>
          {hasMain ? (
            <p className="mt-1.5 text-[10px] text-muted">分析の筋肉疲労度に反映されます</p>
          ) : (
            <p className="mt-1.5 text-[11px] font-bold text-yellow-300">メインの筋肉を1つ以上選んでください</p>
          )}
        </div>
        {!noWeight || v.defaultWeight > 0 ? (
          <Field label="重量の扱い">
            <Segmented
              value={v.weightMode}
              onChange={(x) => up({ weightMode: x as WeightMode })}
              options={Object.entries(WEIGHT_MODES).map(([value, label]) => ({ value: value as WeightMode, label }))}
            />
          </Field>
        ) : null}
        <Field label="記録の単位">
          <Segmented
            value={repUnitOf(v)}
            onChange={(x) => up({ repUnit: x as RepUnit })}
            options={[
              { value: "reps" as RepUnit, label: "回数（例：腕立て）" },
              { value: "sec" as RepUnit, label: "秒数（例：プランク）" },
            ]}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="重量(kg)">
            <NumberInput value={v.defaultWeight} step={0.5} onChange={(x) => up({ defaultWeight: x })} className="text-center" />
          </Field>
          <Field label={isTimed(v) ? "秒数" : "回数"}>
            <NumberInput value={v.defaultReps} onChange={(x) => up({ defaultReps: Math.round(x) })} className="text-center" />
          </Field>
          <Field label="セット数">
            <NumberInput value={v.defaultSets} min={1} onChange={(x) => up({ defaultSets: Math.max(1, Math.round(x)) })} className="text-center" />
          </Field>
        </div>
        <Field label="インターバル（休憩秒数）">
          <div className="flex gap-2">
            <NumberInput value={v.restSec} onChange={(x) => up({ restSec: Math.round(x) })} className="w-24 text-center" />
            <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
              {TIMER_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => up({ restSec: p })}
                  className={cx(
                    "h-11 shrink-0 rounded-xl px-3 text-xs font-bold",
                    v.restSec === p ? "bg-accent" : "bg-card2 text-muted",
                  )}
                >
                  {p}秒
                </button>
              ))}
            </div>
          </div>
        </Field>
        <Field label="運動強度（消費カロリー概算に使用）">
          <Segmented
            value={v.intensity}
            onChange={(x) => up({ intensity: x as Intensity })}
            options={Object.entries(INTENSITY).map(([value, label]) => ({ value: value as Intensity, label }))}
          />
        </Field>
        <Field label="メモ">
          <TextArea value={v.memo} onChange={(e) => up({ memo: e.target.value })} rows={2} placeholder="フォーム、注意点、次回目標など" />
        </Field>
        <div className="rounded-xl bg-card2 p-3">
          <button
            type="button"
            onClick={() => setGuideOpen((o) => !o)}
            className="flex w-full items-center justify-between text-xs font-bold text-muted"
            aria-expanded={guideOpen}
          >
            フォーム解説（任意）
            {guideOpen ? <UpIcon size={16} /> : <DownIcon size={16} />}
          </button>
          {guideOpen && (
          <div className="mt-3 space-y-3">
            {stdGuide && !hasGuideContent(guideValue) && (
              <div className="flex items-center gap-2 rounded-lg bg-card p-2.5 text-[11px] text-muted">
                <span className="flex-1">空欄のままなら標準の解説を表示します</span>
                <button
                  type="button"
                  className="shrink-0 font-bold text-accent"
                  onClick={() =>
                    setGuide({
                      setup: stdGuide.setup,
                      movement: stdGuide.movement,
                      tips: stdGuide.tips,
                      mistakes: stdGuide.mistakes.join("\n"),
                      caution: stdGuide.caution,
                    })
                  }
                >
                  標準をコピーして編集
                </button>
              </div>
            )}
            <Field label="開始姿勢">
              <TextArea value={guide.setup} onChange={(e) => upGuide({ setup: e.target.value })} rows={2} placeholder="例：床に仰向け。膝を曲げる。" />
            </Field>
            <Field label="動作">
              <TextArea value={guide.movement} onChange={(e) => upGuide({ movement: e.target.value })} rows={2} placeholder="例：肘を曲げて下ろし、押し上げる。" />
            </Field>
            <Field label="フォームのポイント">
              <TextArea value={guide.tips} onChange={(e) => upGuide({ tips: e.target.value })} rows={2} placeholder="例：肩甲骨を寄せて胸を張る。" />
            </Field>
            <Field label="よくあるミス（1行に1つ）">
              <TextArea value={guide.mistakes} onChange={(e) => upGuide({ mistakes: e.target.value })} rows={3} placeholder={"例：腰を反る\n反動を使う"} />
            </Field>
            <Field label="注意点">
              <TextArea value={guide.caution} onChange={(e) => upGuide({ caution: e.target.value })} rows={2} placeholder="例：肩に痛みが出たら中止。" />
            </Field>
          </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function ExerciseHistory({ id, onClose }: { id: string | null; onClose: () => void }) {
  const data = useApp();
  const ex = data.exercises.find((e) => e.id === id);
  const rows = data.sessions
    .filter((s) => s.completed)
    .sort((a, b) => a.startAt - b.startAt)
    .flatMap((s) =>
      s.exercises
        .filter((e) => e.exerciseId === id && e.sets.some((x) => x.done))
        .map((e) => {
          const done = e.sets.filter((x) => x.done);
          return {
            date: s.date,
            label: fmtDate(s.date),
            maxWeight: Math.max(...done.map((x) => x.weight)),
            e1rm: Math.max(...done.map((x) => estimate1RM(x.weight, x.reps))),
            reps: done.reduce((a, x) => a + x.reps, 0),
            best: Math.max(...done.map((x) => x.reps)),
            sets: done.length,
            volume: Math.round(done.reduce((a, x) => a + setVolume(e, x), 0)),
            detail: done.map((x) => fmtSet(e, x)).join(" / "),
            memo: e.memo,
          };
        }),
    );
  const timed = !!ex && isTimed(ex);
  const unit = timed ? "秒" : "回";
  const hasWeight = !timed && rows.some((r) => r.maxWeight > 0);
  const pr = id ? personalRecord(data.sessions, id) : null;

  return (
    <Sheet open={!!id} onClose={onClose} title={`${ex?.name ?? ""} の履歴`}>
      {rows.length === 0 ? (
        <Empty>まだ記録がありません。</Empty>
      ) : (
        <>
          {pr && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {hasWeight ? (
                <>
                  <PrStat label="推定1RM" value={pr.best1RM} unit="kg" sub={pr.best1RMDate && fmtDate(pr.best1RMDate)} />
                  <PrStat label="最大重量" value={pr.bestWeight} unit="kg" />
                  <PrStat label="最大ボリューム" value={pr.bestVolume} unit="kg" />
                </>
              ) : (
                <>
                  <PrStat label={timed ? "最長" : "最高回数"} value={pr.bestReps} unit={unit} />
                  <PrStat label="記録回数" value={rows.length} unit="回" />
                  <PrStat label={timed ? "累計秒数" : "累計回数"} value={rows.reduce((a, r) => a + r.reps, 0)} unit={unit} />
                </>
              )}
            </div>
          )}
          <div className="h-48 rounded-xl bg-card2 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#2c2c39" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "#9a9aab", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9a9aab", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#16161d", border: "1px solid #2c2c39", borderRadius: 12, fontSize: 12 }} />
                {hasWeight ? (
                  <>
                    <Line type="monotone" dataKey="maxWeight" name="最大重量(kg)" stroke="#ff6b2c" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="e1rm" name="推定1RM(kg)" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                  </>
                ) : timed ? (
                  <Line type="monotone" dataKey="best" name="最長(秒)" stroke="#ff6b2c" strokeWidth={2} dot />
                ) : (
                  <Line type="monotone" dataKey="reps" name="総回数" stroke="#ff6b2c" strokeWidth={2} dot />
                )}
                <Line type="monotone" dataKey="sets" name="セット数" stroke="#34d399" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2">
            {[...rows].reverse().map((r, i) => (
              <li key={i} className="rounded-xl bg-card2 px-3 py-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold">{r.label}</span>
                  <span className="text-xs text-muted">
                    {r.sets}セット・{`${r.reps}${unit}`}
                    {r.volume > 0 ? `・${r.volume}kg` : ""}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted tabular-nums">{r.detail}</div>
                {r.memo && <div className="mt-0.5 text-[11px] text-white/60">📝 {r.memo}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}

function PrStat({ label, value, unit, sub }: { label: string; value: number; unit: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-card2 p-2.5 text-center">
      <div className="text-[10px] font-bold text-muted">🏅 {label}</div>
      <div className="text-lg font-extrabold tabular-nums">
        {value || "-"}
        <span className="text-[10px] text-muted">{unit}</span>
      </div>
      {sub && <div className="text-[9px] text-muted">{sub}</div>}
    </div>
  );
}

/* ---------------- テンプレート ---------------- */

function TemplatesTab() {
  const data = useApp();
  const [editing, setEditing] = useState<{ id?: string; name: string; ids: string[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);
  const exName = (id: string) => data.exercises.find((e) => e.id === id)?.name;

  return (
    <div className="space-y-3 pb-4">
      <Button className="w-full" onClick={() => setEditing({ name: "", ids: [] })}>
        <PlusIcon size={16} /> テンプレートを作成
      </Button>
      {data.templates.length === 0 && <Empty>「胸＋三頭の日」「脚＋腹の日」など、複数種目をまとめて保存できます。</Empty>}
      <ul className="space-y-2">
        {data.templates.map((t) => {
          const days = data.weekdaySchedule
            .map((w, i) => (w === t.id ? WEEKDAYS[i] : null))
            .filter(Boolean);
          return (
            <li key={t.id} className="rounded-2xl bg-card p-3">
              <div className="flex items-center gap-2">
                <span className="flex-1 font-bold">{t.name}</span>
                {days.length > 0 && <Badge color="accent">{days.join("・")}曜</Badge>}
              </div>
              <ol className="mt-2 space-y-1">
                {t.exerciseIds.map((id, i) => (
                  <li key={id} className="text-xs text-muted">
                    {i + 1}. {exName(id) ?? "（削除された種目）"}
                  </li>
                ))}
                {t.exerciseIds.length === 0 && <li className="text-xs text-muted">種目なし</li>}
              </ol>
              <div className="mt-2 flex justify-end gap-1 border-t border-line/50 pt-2">
                <IconBtn label="複製" onClick={() => data.duplicateTemplate(t.id)}>
                  <CopyIcon size={16} />
                </IconBtn>
                <IconBtn label="編集" onClick={() => setEditing({ id: t.id, name: t.name, ids: [...t.exerciseIds] })}>
                  <EditIcon size={16} />
                </IconBtn>
                <IconBtn label="削除" onClick={() => setConfirmDelete(t)}>
                  <TrashIcon size={16} />
                </IconBtn>
              </div>
            </li>
          );
        })}
      </ul>

      {editing && (
        <Sheet
          open
          onClose={() => setEditing(null)}
          title={editing.id ? "テンプレートを編集" : "テンプレートを作成"}
          footer={
            <Button
              size="lg"
              className="w-full"
              disabled={!editing.name.trim()}
              onClick={() => {
                if (editing.id) data.updateTemplate(editing.id, { name: editing.name.trim(), exerciseIds: editing.ids });
                else data.addTemplate(editing.name.trim(), editing.ids);
                toast("テンプレートを保存しました", editing.name, "✅");
                setEditing(null);
              }}
            >
              保存
            </Button>
          }
        >
          <div className="space-y-4">
            <Field label="テンプレート名">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="例：胸＋三頭の日" />
            </Field>
            <div>
              <div className="mb-1 text-xs font-bold text-muted">種目（実施順）</div>
              {editing.ids.length === 0 && <Empty>下の一覧から種目を追加してください</Empty>}
              <ol className="space-y-1.5">
                {editing.ids.map((id, i) => (
                  <li key={id} className="flex items-center gap-2 rounded-xl bg-card2 px-3 py-2">
                    <span className="w-5 text-xs font-bold text-accent">{i + 1}</span>
                    <span className="flex-1 truncate text-sm font-bold">{exName(id)}</span>
                    <button
                      aria-label="上へ"
                      disabled={i === 0}
                      className="grid h-8 w-8 place-items-center text-muted disabled:opacity-20"
                      onClick={() => {
                        const ids = [...editing.ids];
                        [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                        setEditing({ ...editing, ids });
                      }}
                    >
                      <UpIcon size={16} />
                    </button>
                    <button
                      aria-label="下へ"
                      disabled={i === editing.ids.length - 1}
                      className="grid h-8 w-8 place-items-center text-muted disabled:opacity-20"
                      onClick={() => {
                        const ids = [...editing.ids];
                        [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
                        setEditing({ ...editing, ids });
                      }}
                    >
                      <DownIcon size={16} />
                    </button>
                    <button
                      aria-label="外す"
                      className="grid h-8 w-8 place-items-center text-muted"
                      onClick={() => setEditing({ ...editing, ids: editing.ids.filter((x) => x !== id) })}
                    >
                      <XIcon size={16} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <div className="mb-1 text-xs font-bold text-muted">種目を追加</div>
              {data.exercises.length === 0 ? (
                <Empty>先に「種目」タブで種目を登録してください</Empty>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {data.exercises
                    .filter((e) => !editing.ids.includes(e.id))
                    .map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setEditing({ ...editing, ids: [...editing.ids, e.id] })}
                        className="flex h-9 items-center gap-1 rounded-full bg-card2 px-3 text-xs font-bold active:bg-line"
                      >
                        <PlusIcon size={12} className="text-accent" />
                        {e.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </Sheet>
      )}

      <Sheet
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="テンプレートを削除しますか？"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) data.deleteTemplate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              削除する
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">「{confirmDelete?.name}」を削除し、曜日スケジュール・予定からも外します。</p>
      </Sheet>
    </div>
  );
}

/* ---------------- 曜日スケジュール ---------------- */

function ScheduleTab() {
  const data = useApp();
  const options = [
    { value: "__none", label: "未設定" },
    { value: "rest", label: "🛌 休養日" },
    ...data.templates.map((t) => ({ value: t.id, label: t.name })),
  ];
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div className="space-y-3 pb-4">
      <Card>
        <p className="mb-3 text-xs text-muted">
          曜日ごとにテンプレートを割り当てると、その日の「筋トレを開始」で自動表示されます。特定の日だけ変更する場合はカレンダーから設定できます。
        </p>
        <ul className="space-y-2">
          {order.map((wd) => (
            <li key={wd} className="flex items-center gap-3">
              <span
                className={cx(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold",
                  wd === 0 ? "bg-red-500/15 text-red-400" : wd === 6 ? "bg-sky-500/15 text-sky-400" : "bg-card2",
                )}
              >
                {WEEKDAYS[wd]}
              </span>
              <Select
                value={data.weekdaySchedule[wd] ?? "__none"}
                onChange={(v) => data.setWeekday(wd, v === "__none" ? null : v)}
                options={options}
              />
            </li>
          ))}
        </ul>
      </Card>
      {data.templates.length === 0 && <Empty>テンプレートを作成すると曜日に割り当てられます。</Empty>}
    </div>
  );
}
