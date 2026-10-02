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
  memo: string;
  muscles: Partial<Record<Muscle, number>>;
}

type Row = [
  key: string,
  name: string,
  bodyPart: BodyPart,
  equipment: Equipment,
  weightMode: WeightMode,
  weight: number,
  reps: number,
  restSec: number,
  intensity: Intensity,
  memo: string,
  muscles: Partial<Record<Muscle, number>>,
];

/* 回数欄の単位：プランク・サイドプランク・ダンベル保持は「秒」 */
const ROWS: Row[] = [
  // 胸
  ["dbFloorPress", "ダンベルフロアプレス", "chest", "dumbbell", "per_hand", 10, 10, 90, "moderate", "主に効く：大胸筋・三頭筋", { chest: 1, triceps: 0.5, shoulder: 0.3 }],
  ["dbFly", "ダンベルフライ（床）", "chest", "dumbbell", "per_hand", 6, 12, 60, "light", "主に効く：大胸筋", { chest: 1, shoulder: 0.2 }],
  ["bbFloorPress", "バーベルフロアプレス", "chest", "barbell", "total", 30, 10, 90, "high", "主に効く：大胸筋・三頭筋", { chest: 1, triceps: 0.5, shoulder: 0.3 }],
  ["pushup", "ノーマル腕立て", "chest", "bodyweight", "total", 0, 15, 60, "moderate", "主に効く：大胸筋・三頭筋", { chest: 1, triceps: 0.5, shoulder: 0.3, abs: 0.2 }],
  ["widePushup", "ワイド腕立て", "chest", "bodyweight", "total", 0, 12, 60, "moderate", "主に効く：大胸筋メイン", { chest: 1, shoulder: 0.3, triceps: 0.2 }],
  ["narrowPushup", "ナロー／ダイヤモンド腕立て", "chest", "bodyweight", "total", 0, 10, 60, "moderate", "主に効く：三頭筋・胸", { triceps: 1, chest: 0.6, shoulder: 0.2 }],
  // 肩
  ["shoulderPress", "ショルダープレス", "shoulder", "dumbbell", "per_hand", 8, 10, 90, "moderate", "主に効く：三角筋・三頭筋", { shoulder: 1, triceps: 0.5 }],
  ["sideRaise", "サイドレイズ", "shoulder", "dumbbell", "per_hand", 4, 12, 60, "light", "主に効く：三角筋の横。肩幅狙い", { shoulder: 1 }],
  ["frontRaise", "フロントレイズ", "shoulder", "dumbbell", "per_hand", 4, 12, 60, "light", "主に効く：三角筋の前", { shoulder: 1, chest: 0.2 }],
  ["rearRaise", "リアレイズ", "shoulder", "dumbbell", "per_hand", 4, 12, 60, "light", "主に効く：三角筋の後ろ", { shoulder: 1, back: 0.4 }],
  ["pikePushup", "パイクプッシュアップ", "shoulder", "bodyweight", "total", 0, 10, 60, "moderate", "主に効く：三角筋・三頭筋", { shoulder: 1, triceps: 0.5 }],
  // 背中
  ["oneHandRow", "ワンハンドロウ", "back", "dumbbell", "left_right", 10, 10, 90, "moderate", "主に効く：広背筋・僧帽筋", { back: 1, biceps: 0.4, forearm: 0.2 }],
  ["dbBentRow", "ダンベルベントオーバーロウ", "back", "dumbbell", "per_hand", 10, 10, 90, "moderate", "主に効く：広背筋・背中中央", { back: 1, biceps: 0.4, forearm: 0.2 }],
  ["bbBentRow", "バーベルベントオーバーロウ", "back", "barbell", "total", 30, 10, 90, "high", "主に効く：広背筋・僧帽筋・二頭筋", { back: 1, biceps: 0.5, forearm: 0.3 }],
  ["rdl", "ルーマニアンデッドリフト", "back", "barbell", "total", 30, 10, 90, "high", "主に効く：ハムストリングス・尻・脊柱起立筋（ダンベルでも可）", { hamstrings: 1, glutes: 0.8, back: 0.5, forearm: 0.2 }],
  // 力こぶ
  ["dbCurl", "ダンベルカール", "biceps", "dumbbell", "per_hand", 8, 10, 60, "light", "主に効く：上腕二頭筋", { biceps: 1, forearm: 0.3 }],
  ["hammerCurl", "ハンマーカール", "biceps", "dumbbell", "per_hand", 8, 10, 60, "light", "主に効く：上腕筋・二頭筋・前腕", { biceps: 0.8, forearm: 0.8 }],
  ["bbCurl", "バーベルカール", "biceps", "barbell", "total", 20, 10, 60, "moderate", "主に効く：上腕二頭筋", { biceps: 1, forearm: 0.3 }],
  // 二の腕裏
  ["ohExtension", "オーバーヘッドトライセプスエクステンション", "triceps", "dumbbell", "total", 10, 10, 60, "light", "主に効く：上腕三頭筋", { triceps: 1 }],
  ["narrowFloorPress", "ナローフロアプレス", "triceps", "dumbbell", "per_hand", 8, 10, 60, "moderate", "主に効く：上腕三頭筋・胸（連結バーでも可）", { triceps: 1, chest: 0.5 }],
  // 前腕・握力
  ["wristCurl", "リストカール", "forearm", "dumbbell", "per_hand", 6, 15, 45, "light", "主に効く：前腕の手のひら側", { forearm: 1 }],
  ["reverseWristCurl", "リバースリストカール", "forearm", "dumbbell", "per_hand", 4, 15, 45, "light", "主に効く：前腕の手の甲側", { forearm: 1 }],
  ["reverseCurl", "リバースカール", "forearm", "dumbbell", "per_hand", 6, 12, 60, "light", "主に効く：腕橈骨筋・前腕（連結バーでも可）", { forearm: 1, biceps: 0.5 }],
  ["handgrip", "ハンドグリップ", "forearm", "handgrip", "total", 0, 20, 30, "light", "主に効く：握力・前腕", { forearm: 1 }],
  ["dbHold", "ダンベル保持", "forearm", "dumbbell", "per_hand", 12, 30, 45, "light", "主に効く：握力・前腕（回数欄は秒数）", { forearm: 1, back: 0.2 }],
  // 腹
  ["abRoller", "腹筋ローラー", "abs", "abroller", "total", 0, 10, 60, "high", "主に効く：腹直筋・体幹", { abs: 1, back: 0.3, shoulder: 0.2 }],
  ["crunch", "クランチ", "abs", "bodyweight", "total", 0, 20, 45, "light", "主に効く：腹直筋", { abs: 1 }],
  ["legRaise", "レッグレイズ", "abs", "bodyweight", "total", 0, 15, 45, "moderate", "主に効く：腹直筋下部・腸腰筋", { abs: 1, quads: 0.2 }],
  ["plank", "プランク", "abs", "bodyweight", "total", 0, 30, 45, "moderate", "主に効く：腹筋全体・体幹（回数欄は秒数）", { abs: 1, shoulder: 0.2 }],
  ["sidePlank", "サイドプランク", "abs", "bodyweight", "total", 0, 30, 45, "moderate", "主に効く：腹斜筋（回数欄は秒数）", { abs: 1 }],
  // 脚・尻
  ["gobletSquat", "ゴブレットスクワット", "legs", "dumbbell", "total", 12, 12, 90, "moderate", "主に効く：太もも前・尻", { quads: 1, glutes: 0.7, hamstrings: 0.3, abs: 0.2 }],
  ["dbSquat", "ダンベルスクワット", "legs", "dumbbell", "per_hand", 10, 12, 90, "moderate", "主に効く：太もも・尻", { quads: 1, glutes: 0.7, hamstrings: 0.4 }],
  ["bulgarian", "ブルガリアンスクワット", "legs", "dumbbell", "per_hand", 6, 10, 90, "high", "主に効く：尻・太もも（椅子を使用）", { glutes: 1, quads: 0.9, hamstrings: 0.4 }],
  ["hipLift", "ヒップリフト", "legs", "bodyweight", "total", 0, 15, 60, "light", "主に効く：大臀筋・ハムストリングス（ダンベルを乗せても可）", { glutes: 1, hamstrings: 0.6 }],
  ["calfRaise", "カーフレイズ", "legs", "bodyweight", "total", 0, 20, 45, "light", "主に効く：ふくらはぎ（ダンベルを持っても可）", { calves: 1 }],
];

export const SAMPLE_EXERCISES: SampleExercise[] = ROWS.map(
  ([key, name, bodyPart, equipment, weightMode, defaultWeight, defaultReps, restSec, intensity, memo, muscles]) => ({
    key,
    name,
    bodyPart,
    equipment,
    weightMode,
    defaultWeight,
    defaultReps,
    defaultSets: 3,
    restSec,
    intensity,
    memo,
    muscles,
  }),
);

export const SAMPLE_TEMPLATES: { name: string; keys: string[] }[] = [
  { name: "胸＋三頭の日", keys: ["dbFloorPress", "dbFly", "pushup", "narrowPushup", "ohExtension"] },
  { name: "背中＋二頭の日", keys: ["oneHandRow", "dbBentRow", "rdl", "dbCurl", "hammerCurl"] },
  { name: "肩＋前腕の日", keys: ["shoulderPress", "sideRaise", "rearRaise", "wristCurl", "reverseWristCurl", "handgrip"] },
  { name: "脚＋腹の日", keys: ["gobletSquat", "bulgarian", "hipLift", "calfRaise", "abRoller", "plank"] },
];

/** サンプル適用時の曜日スケジュール（index = 曜日, 0=日） */
export const SAMPLE_WEEKDAYS: (string | null)[] = ["rest", "胸＋三頭の日", "背中＋二頭の日", "rest", "肩＋前腕の日", "脚＋腹の日", "rest"];
