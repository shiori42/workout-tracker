import type {
  BodyPart,
  Equipment,
  Intensity,
  MealType,
  Muscle,
  PhotoKind,
  WeightMode,
} from "./types";
import { FORM_GUIDES } from "./formGuides";

export const BODY_PARTS: Record<BodyPart, string> = {
  chest: "胸",
  back: "背中",
  shoulder: "肩",
  biceps: "腕（二頭）",
  triceps: "腕（三頭）",
  forearm: "前腕",
  abs: "腹",
  legs: "脚・尻",
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
  /** 旧名・別名。既存種目のID引き継ぎに使う */
  aliases: string[];
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

/* 種目名・部位・並び順は「筋トレ種目_フォームポイント一覧.xlsx」に準拠。
   回数欄の単位：ダンベル保持・プランク・サイドプランクは「秒」 */
const ROWS: Row[] = [
  // 胸
  ["dbFloorPress", "ダンベルフロアプレス", "chest", "dumbbell", "per_hand", 10, 10, 90, "moderate", "主に効く：大胸筋", { chest: 1, triceps: 0.5, shoulder: 0.3 }],
  ["dbFly", "ダンベルフライ（床）", "chest", "dumbbell", "per_hand", 6, 12, 60, "light", "主に効く：大胸筋", { chest: 1, shoulder: 0.3 }],
  ["bbFloorPress", "バーベルフロアプレス", "chest", "barbell", "total", 30, 10, 90, "high", "主に効く：大胸筋", { chest: 1, triceps: 0.5, shoulder: 0.3 }],
  ["pushup", "ノーマルプッシュアップ", "chest", "bodyweight", "total", 0, 15, 60, "moderate", "主に効く：大胸筋", { chest: 1, triceps: 0.5, shoulder: 0.3, abs: 0.2 }],
  ["widePushup", "ワイドプッシュアップ", "chest", "bodyweight", "total", 0, 12, 60, "moderate", "主に効く：大胸筋", { chest: 1, shoulder: 0.3, triceps: 0.3 }],
  // 腕（三頭）
  ["narrowPushup", "ナロープッシュアップ", "triceps", "bodyweight", "total", 0, 10, 60, "moderate", "主に効く：上腕三頭筋", { triceps: 1, chest: 0.6, shoulder: 0.2 }],
  ["diamondPushup", "ダイヤモンドプッシュアップ", "triceps", "bodyweight", "total", 0, 8, 60, "high", "主に効く：上腕三頭筋", { triceps: 1, chest: 0.5 }],
  // 肩
  ["shoulderPress", "ダンベルショルダープレス", "shoulder", "dumbbell", "per_hand", 8, 10, 90, "moderate", "主に効く：三角筋", { shoulder: 1, triceps: 0.5 }],
  ["sideRaise", "サイドレイズ", "shoulder", "dumbbell", "per_hand", 4, 12, 60, "light", "主に効く：三角筋中部", { shoulder: 1, back: 0.2 }],
  ["frontRaise", "フロントレイズ", "shoulder", "dumbbell", "per_hand", 4, 12, 60, "light", "主に効く：三角筋前部", { shoulder: 1, chest: 0.2 }],
  ["rearRaise", "リアレイズ", "shoulder", "dumbbell", "per_hand", 4, 12, 60, "light", "主に効く：三角筋後部", { shoulder: 1, back: 0.4 }],
  ["pikePushup", "パイクプッシュアップ", "shoulder", "bodyweight", "total", 0, 10, 60, "moderate", "主に効く：三角筋", { shoulder: 1, triceps: 0.5 }],
  // 背中
  ["oneHandRow", "ワンハンドダンベルロウ", "back", "dumbbell", "left_right", 10, 10, 90, "moderate", "主に効く：広背筋", { back: 1, biceps: 0.4, shoulder: 0.2, forearm: 0.2 }],
  ["dbBentRow", "ダンベルベントオーバーロウ", "back", "dumbbell", "per_hand", 10, 10, 90, "moderate", "主に効く：広背筋・僧帽筋", { back: 1, biceps: 0.4, shoulder: 0.2, forearm: 0.2 }],
  ["bbBentRow", "バーベルベントオーバーロウ", "back", "barbell", "total", 30, 10, 90, "high", "主に効く：広背筋・僧帽筋", { back: 1, biceps: 0.5, shoulder: 0.2, forearm: 0.3 }],
  // 腕（二頭）
  ["dbCurl", "ダンベルカール", "biceps", "dumbbell", "per_hand", 8, 10, 60, "light", "主に効く：上腕二頭筋", { biceps: 1, forearm: 0.3 }],
  ["hammerCurl", "ハンマーカール", "biceps", "dumbbell", "per_hand", 8, 10, 60, "light", "主に効く：上腕筋・腕橈骨筋", { biceps: 0.8, forearm: 0.8 }],
  ["bbCurl", "バーベルカール", "biceps", "barbell", "total", 20, 10, 60, "moderate", "主に効く：上腕二頭筋", { biceps: 1, forearm: 0.3 }],
  // 腕（三頭）
  ["ohExtension", "オーバーヘッドトライセプスエクステンション", "triceps", "dumbbell", "total", 10, 10, 60, "light", "主に効く：上腕三頭筋", { triceps: 1, shoulder: 0.2 }],
  ["narrowFloorPress", "ナローフロアプレス", "triceps", "dumbbell", "per_hand", 8, 10, 60, "moderate", "主に効く：上腕三頭筋（連結バーでも可）", { triceps: 1, chest: 0.5 }],
  // 前腕
  ["wristCurl", "リストカール", "forearm", "dumbbell", "per_hand", 6, 15, 45, "light", "主に効く：前腕屈筋群", { forearm: 1 }],
  ["reverseWristCurl", "リバースリストカール", "forearm", "dumbbell", "per_hand", 4, 15, 45, "light", "主に効く：前腕伸筋群", { forearm: 1 }],
  ["reverseCurl", "リバースカール", "forearm", "dumbbell", "per_hand", 6, 12, 60, "light", "主に効く：腕橈骨筋・前腕伸筋群（連結バーでも可）", { forearm: 1, biceps: 0.5 }],
  // 前腕・握力
  ["handgrip", "ハンドグリップ", "forearm", "handgrip", "total", 0, 20, 30, "light", "主に効く：前腕屈筋群・握力", { forearm: 1 }],
  ["dbHold", "ダンベル保持（ファーマーズホールド）", "forearm", "dumbbell", "per_hand", 12, 30, 45, "light", "主に効く：握力・前腕（回数欄は秒数）", { forearm: 1, back: 0.2, abs: 0.2 }],
  // 腹
  ["abRoller", "腹筋ローラー（膝コロ）", "abs", "abroller", "total", 0, 10, 60, "high", "主に効く：腹直筋・腹横筋", { abs: 1, back: 0.3, shoulder: 0.2, triceps: 0.2 }],
  ["crunch", "クランチ", "abs", "bodyweight", "total", 0, 20, 45, "light", "主に効く：腹直筋", { abs: 1 }],
  ["legRaise", "レッグレイズ", "abs", "bodyweight", "total", 0, 15, 45, "moderate", "主に効く：腹直筋下部・腸腰筋", { abs: 1, quads: 0.2 }],
  ["plank", "プランク", "abs", "bodyweight", "total", 0, 30, 45, "moderate", "主に効く：腹横筋・腹直筋（回数欄は秒数）", { abs: 1, shoulder: 0.2, glutes: 0.2 }],
  ["sidePlank", "サイドプランク", "abs", "bodyweight", "total", 0, 30, 45, "moderate", "主に効く：腹斜筋（回数欄は片側の秒数）", { abs: 1, glutes: 0.2, shoulder: 0.2 }],
  // 脚・尻
  ["gobletSquat", "ゴブレットスクワット", "legs", "dumbbell", "total", 12, 12, 90, "moderate", "主に効く：大腿四頭筋・大臀筋", { quads: 1, glutes: 0.7, hamstrings: 0.3, abs: 0.2 }],
  ["dbSquat", "ダンベルスクワット", "legs", "dumbbell", "per_hand", 10, 12, 90, "moderate", "主に効く：大腿四頭筋・大臀筋", { quads: 1, glutes: 0.7, hamstrings: 0.4 }],
  ["bulgarian", "ブルガリアンスクワット", "legs", "dumbbell", "per_hand", 6, 10, 90, "high", "主に効く：大臀筋・大腿四頭筋（椅子等を使用）", { glutes: 1, quads: 0.9, hamstrings: 0.4 }],
  ["rdl", "ルーマニアンデッドリフト", "legs", "barbell", "total", 30, 10, 90, "high", "主に効く：ハムストリングス・大臀筋（ダンベルでも可）", { hamstrings: 1, glutes: 0.8, back: 0.5, forearm: 0.2 }],
  // 尻・脚
  ["hipLift", "ヒップリフト", "legs", "bodyweight", "total", 0, 15, 60, "light", "主に効く：大臀筋（ダンベルを乗せても可）", { glutes: 1, hamstrings: 0.6 }],
  ["calfRaise", "カーフレイズ", "legs", "bodyweight", "total", 0, 20, 45, "light", "主に効く：下腿三頭筋（ダンベルを持っても可）", { calves: 1 }],
];

export const SAMPLE_EXERCISES: SampleExercise[] = ROWS.map(
  ([key, name, bodyPart, equipment, weightMode, defaultWeight, defaultReps, restSec, intensity, memo, muscles]) => ({
    key,
    name,
    aliases: FORM_GUIDES[key]?.aliases ?? [],
    bodyPart,
    equipment,
    weightMode,
    defaultWeight,
    defaultReps,
    defaultSets: FORM_GUIDES[key]?.sets ?? 3,
    restSec,
    intensity,
    memo,
    muscles,
  }),
);

export const SAMPLE_TEMPLATES: { name: string; keys: string[] }[] = [
  { name: "胸＋三頭の日", keys: ["dbFloorPress", "dbFly", "pushup", "narrowPushup", "ohExtension"] },
  { name: "背中＋二頭の日", keys: ["oneHandRow", "dbBentRow", "bbBentRow", "dbCurl", "hammerCurl"] },
  { name: "肩＋前腕の日", keys: ["shoulderPress", "sideRaise", "rearRaise", "wristCurl", "reverseWristCurl", "handgrip"] },
  { name: "脚＋腹の日", keys: ["gobletSquat", "bulgarian", "rdl", "calfRaise", "abRoller", "plank"] },
];

/** サンプル適用時の曜日スケジュール（index = 曜日, 0=日） */
export const SAMPLE_WEEKDAYS: (string | null)[] = ["rest", "胸＋三頭の日", "背中＋二頭の日", "rest", "肩＋前腕の日", "脚＋腹の日", "rest"];
