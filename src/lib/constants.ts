import type {
  BodyPart,
  Equipment,
  Intensity,
  MealType,
  Muscle,
  PhotoKind,
  WeightMode,
} from "./types";

export const BODY_PARTS: Record<BodyPart, string> = {
  chest: "胸",
  back: "背中",
  shoulder: "肩",
  biceps: "上腕二頭筋",
  triceps: "上腕三頭筋",
  forearm: "前腕",
  abs: "腹",
  legs: "脚",
  other: "その他",
};

export const EQUIPMENT: Record<Equipment, string> = {
  bodyweight: "自重",
  dumbbell: "ダンベル",
  barbell: "バーベル連結棒",
  abroller: "腹筋ローラー",
  handgrip: "ハンドグリップ",
  other: "その他",
};

export const WEIGHT_MODES: Record<WeightMode, string> = {
  total: "合計重量",
  per_hand: "片手重量",
  left_right: "左右別",
};

export const INTENSITY: Record<Intensity, string> = {
  light: "軽度",
  moderate: "中程度",
  high: "高強度",
};

export const METS: Record<Intensity, number> = {
  light: 3.5,
  moderate: 5.0,
  high: 6.0,
};

export const MUSCLES: Record<Muscle, string> = {
  chest: "胸",
  back: "背中",
  shoulder: "肩",
  biceps: "上腕二頭筋",
  triceps: "上腕三頭筋",
  forearm: "前腕",
  abs: "腹",
  glutes: "臀部",
  quads: "大腿四頭筋",
  hamstrings: "ハムストリングス",
  calves: "ふくらはぎ",
};

/** 部位ごとの対象筋寄与率（ExerciseMuscleMap の既定値） */
export const MUSCLE_MAP: Record<BodyPart, Partial<Record<Muscle, number>>> = {
  chest: { chest: 1, triceps: 0.4, shoulder: 0.3 },
  back: { back: 1, biceps: 0.4, forearm: 0.2, shoulder: 0.2 },
  shoulder: { shoulder: 1, triceps: 0.3 },
  biceps: { biceps: 1, forearm: 0.4 },
  triceps: { triceps: 1, chest: 0.2, shoulder: 0.2 },
  forearm: { forearm: 1 },
  abs: { abs: 1 },
  legs: { quads: 1, glutes: 0.7, hamstrings: 0.6, calves: 0.3 },
  other: { abs: 0.3, quads: 0.3 },
};

/** 自重系種目の基準負荷係数 */
export const EQUIP_BASE_LOAD: Record<Equipment, number> = {
  bodyweight: 1.0,
  dumbbell: 1.0,
  barbell: 1.1,
  abroller: 1.3,
  handgrip: 0.5,
  other: 1.0,
};

export const MEAL_TYPES: Record<MealType, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
  other: "その他",
};

export const PHOTO_KINDS: Record<PhotoKind, string> = {
  front: "正面",
  side: "側面",
  back: "背面",
};

export const TIMER_PRESETS = [30, 60, 90, 120, 180];

export const GOAL_PRESETS = [8, 12, 16, 20];

/** 標準動作秒数（1レップあたり） */
export const SEC_PER_REP = 3;

export const DEFAULT_BODY_WEIGHT = 60;

export interface SampleExercise {
  key: string;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  weightMode: WeightMode;
  defaultWeight: number;
  defaultReps: number;
  defaultSets: number;
  restSec: number;
  intensity: Intensity;
}

export const SAMPLE_EXERCISES: SampleExercise[] = [
  { key: "pushup", name: "腕立て伏せ", bodyPart: "chest", equipment: "bodyweight", weightMode: "total", defaultWeight: 0, defaultReps: 15, defaultSets: 3, restSec: 60, intensity: "moderate" },
  { key: "dbpress", name: "ダンベルプレス", bodyPart: "chest", equipment: "dumbbell", weightMode: "per_hand", defaultWeight: 10, defaultReps: 10, defaultSets: 3, restSec: 90, intensity: "moderate" },
  { key: "dbrow", name: "ワンハンドロウ", bodyPart: "back", equipment: "dumbbell", weightMode: "left_right", defaultWeight: 10, defaultReps: 10, defaultSets: 3, restSec: 90, intensity: "moderate" },
  { key: "spress", name: "ショルダープレス", bodyPart: "shoulder", equipment: "dumbbell", weightMode: "per_hand", defaultWeight: 6, defaultReps: 10, defaultSets: 3, restSec: 60, intensity: "moderate" },
  { key: "sraise", name: "サイドレイズ", bodyPart: "shoulder", equipment: "dumbbell", weightMode: "per_hand", defaultWeight: 4, defaultReps: 12, defaultSets: 3, restSec: 60, intensity: "light" },
  { key: "curl", name: "ダンベルカール", bodyPart: "biceps", equipment: "dumbbell", weightMode: "per_hand", defaultWeight: 8, defaultReps: 10, defaultSets: 3, restSec: 60, intensity: "light" },
  { key: "french", name: "フレンチプレス", bodyPart: "triceps", equipment: "dumbbell", weightMode: "total", defaultWeight: 8, defaultReps: 10, defaultSets: 3, restSec: 60, intensity: "light" },
  { key: "grip", name: "ハンドグリップ", bodyPart: "forearm", equipment: "handgrip", weightMode: "total", defaultWeight: 0, defaultReps: 20, defaultSets: 3, restSec: 30, intensity: "light" },
  { key: "roller", name: "腹筋ローラー", bodyPart: "abs", equipment: "abroller", weightMode: "total", defaultWeight: 0, defaultReps: 10, defaultSets: 3, restSec: 60, intensity: "high" },
  { key: "crunch", name: "クランチ", bodyPart: "abs", equipment: "bodyweight", weightMode: "total", defaultWeight: 0, defaultReps: 20, defaultSets: 3, restSec: 45, intensity: "light" },
  { key: "squat", name: "スクワット", bodyPart: "legs", equipment: "bodyweight", weightMode: "total", defaultWeight: 0, defaultReps: 20, defaultSets: 3, restSec: 60, intensity: "moderate" },
  { key: "bulgarian", name: "ブルガリアンスクワット", bodyPart: "legs", equipment: "dumbbell", weightMode: "per_hand", defaultWeight: 6, defaultReps: 10, defaultSets: 3, restSec: 90, intensity: "high" },
];

export const SAMPLE_TEMPLATES: { name: string; keys: string[] }[] = [
  { name: "胸の日", keys: ["pushup", "dbpress", "french"] },
  { name: "背中＋腕の日", keys: ["dbrow", "curl", "grip"] },
  { name: "肩＋腹の日", keys: ["spress", "sraise", "roller", "crunch"] },
  { name: "脚の日", keys: ["squat", "bulgarian"] },
];
