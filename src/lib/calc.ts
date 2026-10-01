import type {
  AIReport,
  BodyPart,
  BodyRecord,
  Intensity,
  Muscle,
  SessionExercise,
  WorkoutSession,
  WorkoutSet,
} from "./types";
import type { AppData } from "./store";
import {
  BODY_PARTS,
  DEFAULT_BODY_WEIGHT,
  EQUIP_BASE_LOAD,
  METS,
  MUSCLES,
  MUSCLE_MAP,
  SEC_PER_REP,
} from "./constants";
import {
  addDays,
  addMonths,
  datesBetween,
  daysInMonth,
  fmtMonth,
  monthOf,
  weekdayOf,
  ymd,
} from "./date";

/* ---------------- 身体 ---------------- */

export const calcBmi = (heightCm: number, weightKg: number) => {
  if (!heightCm || !weightKg) return 0;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
};

export const bmiLabel = (bmi: number) => {
  if (!bmi) return "-";
  if (bmi < 18.5) return "低体重";
  if (bmi < 25) return "普通体重";
  if (bmi < 30) return "肥満(1度)";
  return "肥満(2度以上)";
};

export const sortedBody = (records: BodyRecord[]) =>
  [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

export const latestBody = (records: BodyRecord[], upTo?: string) => {
  const list = sortedBody(records).filter((r) => !upTo || r.date <= upTo);
  return list[list.length - 1];
};

export const bodyWeightAt = (records: BodyRecord[], date?: string) =>
  latestBody(records, date)?.weightKg ||
  latestBody(records)?.weightKg ||
  DEFAULT_BODY_WEIGHT;

/* ---------------- 消費カロリー（METs方式） ---------------- */

const doneSets = (ex: SessionExercise) => ex.sets.filter((s) => s.done);

const bumpIntensity = (i: Intensity): Intensity =>
  i === "light" ? "moderate" : "high";

/** 重量・回数を補助情報として強度を判定 */
export function effectiveIntensity(ex: SessionExercise): Intensity {
  const sets = doneSets(ex);
  if (sets.length === 0) return ex.intensity;
  const avgReps = sets.reduce((a, s) => a + s.reps, 0) / sets.length;
  const avgWeight = sets.reduce((a, s) => a + s.weight, 0) / sets.length;
  if (avgWeight > 0 && avgReps <= 6) return bumpIntensity(ex.intensity);
  if (sets.length >= 5 && ex.restSec <= 45) return bumpIntensity(ex.intensity);
  return ex.intensity;
}

/** 回数×標準動作秒数＋インターバルからの推定時間（分） */
export function estimateExerciseMinutes(ex: SessionExercise) {
  const sets = doneSets(ex);
  if (sets.length === 0) return 0;
  const work = sets.reduce((a, s) => a + s.reps * SEC_PER_REP, 0);
  const rest = Math.max(0, sets.length - 1) * ex.restSec;
  return (work + rest) / 60;
}

export function sessionDurationMinutes(s: WorkoutSession) {
  const estimated = s.exercises.reduce((a, e) => a + estimateExerciseMinutes(e), 0);
  if (s.completed && s.endAt) {
    const measured = (s.endAt - s.startAt) / 60000;
    if (measured >= 1 && estimated > 0) return Math.min(measured, 180);
  }
  return estimated;
}

export interface KcalItem {
  uid: string;
  name: string;
  bodyPart: BodyPart;
  minutes: number;
  intensity: Intensity;
  kcal: number;
}

export function sessionKcalBreakdown(s: WorkoutSession, weightKg: number): KcalItem[] {
  const est = s.exercises.map((e) => estimateExerciseMinutes(e));
  const estTotal = est.reduce((a, b) => a + b, 0);
  const total = sessionDurationMinutes(s);
  return s.exercises.map((e, i) => {
    const minutes = estTotal > 0 ? (est[i] / estTotal) * total : 0;
    const intensity = effectiveIntensity(e);
    const kcal = (METS[intensity] * 3.5 * weightKg) / 200 * minutes;
    return { uid: e.uid, name: e.name, bodyPart: e.bodyPart, minutes, intensity, kcal };
  });
}

export function sessionKcal(s: WorkoutSession, weightKg: number) {
  if (s.kcalOverride !== undefined && s.kcalOverride !== null) return s.kcalOverride;
  return Math.round(
    sessionKcalBreakdown(s, weightKg).reduce((a, x) => a + x.kcal, 0),
  );
}

export const sessionTotals = (s: WorkoutSession) => {
  let sets = 0;
  let plannedSets = 0;
  let reps = 0;
  let volume = 0;
  let doneExercises = 0;
  for (const e of s.exercises) {
    plannedSets += e.sets.length;
    const d = doneSets(e);
    if (e.sets.length > 0 && d.length === e.sets.length) doneExercises++;
    sets += d.length;
    for (const x of d) {
      reps += x.reps;
      volume += setVolume(e, x);
    }
  }
  return { sets, plannedSets, reps, volume, doneExercises, exercises: s.exercises.length };
};

export const setVolume = (e: SessionExercise, x: WorkoutSet) =>
  (e.weightMode === "total" ? x.weight : x.weight * 2) * x.reps;

/** 日付の消費カロリー（トレーニング分 / 手動追加分） */
export function dayBurn(data: AppData, date: string) {
  const w = bodyWeightAt(data.bodyRecords, date);
  const training = data.sessions
    .filter((s) => s.date === date)
    .reduce((a, s) => a + sessionKcal(s, w), 0);
  const extra = data.extraBurns
    .filter((x) => x.date === date)
    .reduce((a, x) => a + x.kcal, 0);
  return { training, extra, total: training + extra };
}

export const dayIntake = (data: AppData, date: string) =>
  data.meals.filter((m) => m.date === date).reduce((a, m) => a + m.kcal, 0);

/* ---------------- 予定・ストリーク ---------------- */

export function planFor(data: AppData, date: string): string | null {
  const a = data.dateAssignments[date];
  if (a !== undefined) return a === "none" ? null : a;
  return data.weekdaySchedule[weekdayOf(date)] ?? null;
}

export const workoutDates = (data: AppData) =>
  new Set(data.stamps.map((s) => s.date));

export function isAchieved(data: AppData, date: string, wd?: Set<string>) {
  const set = wd ?? workoutDates(data);
  if (set.has(date)) return true;
  if (date < (data.settings.startDate || date)) return false;
  return data.settings.restCountsForStreak && planFor(data, date) === "rest";
}

export function currentStreak(data: AppData, today = ymd()) {
  const wd = workoutDates(data);
  const start = earliestDate(data);
  let d = isAchieved(data, today, wd) ? today : addDays(today, -1);
  let n = 0;
  while (d >= start && isAchieved(data, d, wd)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function bestStreak(data: AppData, today = ymd()) {
  const wd = workoutDates(data);
  let best = 0;
  let cur = 0;
  for (const d of datesBetween(earliestDate(data), today)) {
    if (isAchieved(data, d, wd)) {
      cur++;
      best = Math.max(best, cur);
    } else if (d !== today) {
      cur = 0;
    }
  }
  return best;
}

function earliestDate(data: AppData) {
  let start = data.settings.startDate || ymd();
  for (const s of data.stamps) if (s.date < start) start = s.date;
  return start;
}

/* ---------------- 月次集計 ---------------- */

export interface MonthStats {
  month: string;
  trainingDays: number;
  sessions: number;
  totalSets: number;
  totalReps: number;
  volume: number;
  kcal: number;
  extraKcal: number;
  intake: number;
  exerciseKinds: number;
  achievedDays: number;
  goal: number;
  goalRate: number;
  plannedDays: number;
  plannedDone: number;
  partSets: Record<BodyPart, number>;
  weight?: number;
  bmi?: number;
  minutes: number;
}

export function monthStats(data: AppData, month: string, today = ymd()): MonthStats {
  const sessions = data.sessions.filter((s) => s.completed && monthOf(s.date) === month);
  const days = new Set(sessions.map((s) => s.date));
  const partSets = Object.fromEntries(
    Object.keys(BODY_PARTS).map((k) => [k, 0]),
  ) as Record<BodyPart, number>;
  let totalSets = 0;
  let totalReps = 0;
  let volume = 0;
  let kcal = 0;
  let minutes = 0;
  const kinds = new Set<string>();
  for (const s of sessions) {
    const t = sessionTotals(s);
    totalSets += t.sets;
    totalReps += t.reps;
    volume += t.volume;
    kcal += sessionKcal(s, bodyWeightAt(data.bodyRecords, s.date));
    minutes += sessionDurationMinutes(s);
    for (const e of s.exercises) {
      const n = e.sets.filter((x) => x.done).length;
      if (n > 0) kinds.add(e.name);
      partSets[e.bodyPart] += n;
    }
  }
  const monthDates = datesBetween(`${month}-01`, `${month}-${String(daysInMonth(month)).padStart(2, "0")}`);
  const startDate = earliestDate(data);
  const pastDates = monthDates.filter((d) => d <= today && d >= startDate);
  const wd = workoutDates(data);
  let plannedDays = 0;
  let plannedDone = 0;
  let achievedDays = 0;
  for (const d of pastDates) {
    const p = planFor(data, d);
    if (p && p !== "rest") {
      plannedDays++;
      if (wd.has(d)) plannedDone++;
    }
    if (isAchieved(data, d, wd)) achievedDays++;
  }
  const extraKcal = data.extraBurns
    .filter((x) => monthOf(x.date) === month)
    .reduce((a, x) => a + x.kcal, 0);
  const intake = data.meals
    .filter((m) => monthOf(m.date) === month)
    .reduce((a, m) => a + m.kcal, 0);
  const lastInMonth = sortedBody(data.bodyRecords).filter((r) => monthOf(r.date) <= month).pop();
  const goal = data.settings.monthlyGoal || 1;
  return {
    month,
    trainingDays: days.size,
    sessions: sessions.length,
    totalSets,
    totalReps,
    volume: Math.round(volume),
    kcal,
    extraKcal,
    intake,
    exerciseKinds: kinds.size,
    achievedDays,
    goal,
    goalRate: Math.min(1, days.size / goal),
    plannedDays,
    plannedDone,
    partSets,
    weight: lastInMonth?.weightKg,
    bmi: lastInMonth ? calcBmi(lastInMonth.heightCm, lastInMonth.weightKg) : undefined,
    minutes,
  };
}

export const changeRate = (cur: number, prev: number) => {
  if (!prev) return cur ? null : 0;
  return ((cur - prev) / prev) * 100;
};

/* ---------------- 筋肉疲労度 ---------------- */

export interface MuscleFatigue {
  score: number;
  lastAt?: number;
  sets7: number;
  exercises: { name: string; sets: number }[];
}

const INTENSITY_MUL: Record<Intensity, number> = { light: 0.8, moderate: 1, high: 1.2 };
const DECAY_HOURS = 40;

function setStimulus(e: SessionExercise, x: WorkoutSet) {
  const repsFactor = Math.min(2, Math.max(0.3, x.reps / 10));
  const loadFactor =
    x.weight > 0
      ? Math.min(1.8, Math.max(0.8, 0.8 + x.weight / 25))
      : EQUIP_BASE_LOAD[e.equipment];
  return 11 * repsFactor * loadFactor * INTENSITY_MUL[e.intensity];
}

export function computeFatigue(
  sessions: WorkoutSession[],
  now = Date.now(),
): Record<Muscle, MuscleFatigue> {
  const raw = Object.fromEntries(
    Object.keys(MUSCLES).map((m) => [m, { score: 0, sets7: 0, ex: new Map<string, number>() as Map<string, number>, lastAt: undefined as number | undefined }]),
  ) as Record<Muscle, { score: number; sets7: number; ex: Map<string, number>; lastAt?: number }>;

  for (const s of sessions) {
    for (const e of s.exercises) {
      for (const x of e.sets) {
        if (!x.done) continue;
        const t = x.doneAt ?? s.endAt ?? s.startAt;
        const hours = Math.max(0, (now - t) / 3.6e6);
        if (hours > 24 * 14) continue;
        const stim = setStimulus(e, x);
        const decay = Math.exp(-hours / DECAY_HOURS);
        for (const [m, rate] of Object.entries(MUSCLE_MAP[e.bodyPart]) as [Muscle, number][]) {
          const r = raw[m];
          r.score += stim * rate * decay;
          if (rate >= 0.5) {
            if (hours <= 24 * 7) r.sets7 += 1;
            r.ex.set(e.name, (r.ex.get(e.name) ?? 0) + 1);
            r.lastAt = Math.max(r.lastAt ?? 0, t);
          }
        }
      }
    }
  }

  return Object.fromEntries(
    (Object.keys(raw) as Muscle[]).map((m) => [
      m,
      {
        score: Math.min(100, Math.round(raw[m].score)),
        lastAt: raw[m].lastAt,
        sets7: raw[m].sets7,
        exercises: [...raw[m].ex.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, sets]) => ({ name, sets })),
      },
    ]),
  ) as Record<Muscle, MuscleFatigue>;
}

export const recoveryLabel = (score: number) => {
  if (score < 15) return "回復済み";
  if (score < 40) return "軽い疲労";
  if (score < 70) return "疲労あり（軽めに）";
  return "高疲労（休養推奨）";
};

export const fatigueColor = (score: number) => {
  if (score <= 0) return "#2a2a36";
  const t = Math.min(1, score / 100);
  // 黄(48°)→赤(0°)
  const hue = 48 - 48 * t;
  const light = 58 - 12 * t;
  return `hsl(${hue} 95% ${light}%)`;
};

/* ---------------- バッジ ---------------- */

export interface Badge {
  id: string;
  icon: string;
  title: string;
  desc: string;
  achieved: boolean;
}

export function computeBadges(data: AppData, today = ymd()): Badge[] {
  const totalDays = workoutDates(data).size;
  const streak = Math.max(currentStreak(data, today), bestStreak(data, today));
  const ms = monthStats(data, monthOf(today), today);
  const months = new Set(data.sessions.filter((s) => s.completed).map((s) => monthOf(s.date)));
  const goalMonths = [...months].filter(
    (m) => monthStats(data, m, today).trainingDays >= data.settings.monthlyGoal,
  ).length;
  const list: Omit<Badge, "achieved">[] = [];
  const add = (id: string, icon: string, title: string, desc: string) =>
    list.push({ id, icon, title, desc });
  add("first", "🌱", "はじめの一歩", "初めてトレーニングを完了");
  add("s3", "🔥", "3日連続", "ストリーク3日");
  add("s7", "⚡", "1週間継続", "ストリーク7日");
  add("s14", "💪", "2週間継続", "ストリーク14日");
  add("s30", "🏆", "1か月継続", "ストリーク30日");
  add("d10", "🥉", "累計10日", "トレーニング日数10日");
  add("d30", "🥈", "累計30日", "トレーニング日数30日");
  add("d100", "🥇", "累計100日", "トレーニング日数100日");
  add("goal", "🎯", "月間目標達成", `月${data.settings.monthlyGoal}回を達成`);
  add("body", "📸", "記録の習慣", "身体記録を3か月分登録");
  const bodyMonths = new Set(data.bodyRecords.map((r) => monthOf(r.date))).size;
  const ok: Record<string, boolean> = {
    first: totalDays >= 1,
    s3: streak >= 3,
    s7: streak >= 7,
    s14: streak >= 14,
    s30: streak >= 30,
    d10: totalDays >= 10,
    d30: totalDays >= 30,
    d100: totalDays >= 100,
    goal: goalMonths > 0 || ms.trainingDays >= data.settings.monthlyGoal,
    body: bodyMonths >= 3,
  };
  return list.map((b) => ({ ...b, achieved: !!ok[b.id] }));
}

/* ---------------- AIレポート（集計ベースの定型レポート） ---------------- */

export function generateReport(data: AppData, month: string, today = ymd()): AIReport {
  const cur = monthStats(data, month, today);
  const prev = monthStats(data, addMonths(month, -1), today);
  const streak = currentStreak(data, today);
  const best = bestStreak(data, today);
  const highlights: string[] = [];
  const cautions: string[] = [];
  const suggestions: string[] = [];

  const label = fmtMonth(month);
  const pct = Math.round(cur.goalRate * 100);
  const summary =
    cur.trainingDays === 0
      ? `${label}はまだトレーニング記録がありません。まずは週2回、1回15分からのスタートがおすすめです。`
      : `${label}は${cur.trainingDays}日・${cur.sessions}セッションのトレーニングを実施し、総セット数は${cur.totalSets}セット、推定消費カロリーは約${Math.round(cur.kcal)}kcalでした。月間目標（${cur.goal}回）の達成率は${pct}%です。`;

  if (cur.trainingDays > 0 && prev.trainingDays > 0) {
    if (cur.trainingDays > prev.trainingDays)
      highlights.push(`トレーニング日数が前月より${cur.trainingDays - prev.trainingDays}日増えました。`);
    if (cur.volume > prev.volume && prev.volume > 0)
      highlights.push(`総負荷量が前月比 +${Math.round(((cur.volume - prev.volume) / prev.volume) * 100)}% と伸びています。`);
    if (cur.totalSets > prev.totalSets)
      highlights.push(`総セット数が${prev.totalSets}→${cur.totalSets}セットに増加しました。`);
  }
  if (pct >= 100) highlights.push("月間目標を達成しました。素晴らしい継続力です。");
  if (best >= 7) highlights.push(`最高ストリーク${best}日を記録しています。`);
  if (cur.exerciseKinds >= 5) highlights.push(`${cur.exerciseKinds}種目に取り組み、バランス良く刺激できています。`);
  if (highlights.length === 0 && cur.trainingDays > 0)
    highlights.push("記録を継続できていること自体が大きな成果です。");

  const parts = (Object.entries(cur.partSets) as [BodyPart, number][]).filter(([k]) => k !== "other");
  const totalPartSets = parts.reduce((a, [, n]) => a + n, 0);
  if (totalPartSets > 0) {
    const sorted = [...parts].sort((a, b) => b[1] - a[1]);
    const [topPart, topN] = sorted[0];
    const missing = parts.filter(([, n]) => n === 0).map(([k]) => BODY_PARTS[k]);
    if (topN / totalPartSets >= 0.4)
      cautions.push(`${BODY_PARTS[topPart]}のセット数が全体の${Math.round((topN / totalPartSets) * 100)}%を占めており、偏りがあります。`);
    if (missing.length > 0 && missing.length <= 5)
      cautions.push(`${missing.join("・")}は今月まだ実施していません。`);
  }
  const fatigue = computeFatigue(data.sessions);
  const tired = (Object.entries(fatigue) as [Muscle, MuscleFatigue][]).filter(([, f]) => f.score >= 70);
  if (tired.length > 0)
    cautions.push(`${tired.map(([m]) => MUSCLES[m]).join("・")}の推定疲労度が高めです。48〜72時間の休養を目安にしてください。`);
  if (cur.trainingDays > 0 && streak === 0)
    cautions.push("直近はトレーニングが途切れています。短時間メニューでの再開がおすすめです。");
  if (cautions.length === 0) cautions.push("大きな偏りは見られません。睡眠と休養も意識しましょう。");

  const nextGoal = cur.trainingDays >= cur.goal ? cur.goal + 2 : Math.max(4, cur.goal);
  suggestions.push(`翌月は月${nextGoal}回（週${Math.ceil(nextGoal / 4)}回程度）を目安にしましょう。`);
  if (totalPartSets > 0) {
    const weakest = [...parts].sort((a, b) => a[1] - b[1])[0];
    suggestions.push(`${BODY_PARTS[weakest[0]]}の種目を1つメニューに追加すると全身のバランスが整います。`);
  }
  if (cur.volume > 0) suggestions.push("同じ重量で回数が目標に届いた種目は、次回0.5〜1kgの増量を試してみましょう。");
  if (cur.weight && prev.weight) {
    const diff = Math.round((cur.weight - prev.weight) * 10) / 10;
    suggestions.push(
      diff === 0
        ? "体重は前月から横ばいです。目的に合わせて食事量を調整しましょう。"
        : `体重は前月比 ${diff > 0 ? "+" : ""}${diff}kg です。食事記録と合わせて推移を確認しましょう。`,
    );
  } else {
    suggestions.push("月1回の身体記録（体重・写真）を登録すると、変化をより詳しく振り返れます。");
  }

  return {
    month,
    generatedAt: Date.now(),
    summary,
    highlights,
    cautions,
    suggestions,
  };
}

export { addDays, monthOf, ymd };
