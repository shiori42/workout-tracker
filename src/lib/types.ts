export type BodyPart =
  | "chest"
  | "back"
  | "shoulder"
  | "biceps"
  | "triceps"
  | "forearm"
  | "abs"
  | "legs"
  | "other";

export type Equipment =
  | "bodyweight"
  | "dumbbell"
  | "barbell"
  | "abroller"
  | "handgrip"
  | "other";

export type WeightMode = "total" | "per_hand" | "left_right";
/** セットの数値欄の単位（回数 or 秒数） */
export type RepUnit = "reps" | "sec";
export type Intensity = "light" | "moderate" | "high";

export type Muscle =
  | "chest"
  | "back"
  | "shoulder"
  | "biceps"
  | "triceps"
  | "forearm"
  | "abs"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";
export type PhotoKind = "front" | "side" | "back";

export interface Exercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  weightMode: WeightMode;
  /** 未指定なら回数（標準の秒数種目は名前で判定） */
  repUnit?: RepUnit;
  defaultWeight: number;
  defaultReps: number;
  defaultSets: number;
  restSec: number;
  intensity: Intensity;
  memo: string;
  /** 対象筋と寄与率。未指定なら部位の既定値（MUSCLE_MAP）を使う */
  muscles?: Partial<Record<Muscle, number>>;
  /** ユーザーが書いたフォーム解説。未指定なら標準の解説（種目名で検索）を使う */
  guide?: ExerciseGuide;
  createdAt: number;
}

export interface ExerciseGuide {
  setup: string;
  movement: string;
  tips: string;
  mistakes: string[];
  caution: string;
}

export interface Template {
  id: string;
  name: string;
  exerciseIds: string[];
}

/** templateId | "rest" | "none"（曜日設定を打ち消す） */
export type PlanValue = string;

export interface WorkoutSet {
  weight: number;
  reps: number;
  done: boolean;
  doneAt?: number;
}

export interface SessionExercise {
  uid: string;
  exerciseId: string;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  weightMode: WeightMode;
  repUnit?: RepUnit;
  intensity: Intensity;
  restSec: number;
  sets: WorkoutSet[];
  memo: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  templateId?: string;
  templateName?: string;
  startAt: number;
  endAt?: number;
  exercises: SessionExercise[];
  kcalOverride?: number;
  note: string;
  completed: boolean;
}

export interface MealRecord {
  id: string;
  date: string;
  mealType: MealType;
  foodName: string;
  amount: string;
  kcal: number;
  proteinG?: number;
  fatG?: number;
  carbG?: number;
  photoKey?: string;
  note: string;
  createdAt: number;
}

export interface ExtraBurn {
  id: string;
  date: string;
  label: string;
  kcal: number;
}

export interface BodyPhoto {
  kind: PhotoKind;
  key: string;
}

export interface BodyRecord {
  id: string;
  date: string;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
  muscleKg?: number;
  waistCm?: number;
  photos: BodyPhoto[];
  note: string;
}

export interface Stamp {
  date: string;
  type: "workout";
  reason: string;
}

export interface NotificationSettings {
  training: { enabled: boolean; time: string };
  body: { enabled: boolean; day: number; time: string };
  meal: { enabled: boolean; time: string };
  interval: { enabled: boolean };
}

export interface Settings {
  nickname: string;
  monthlyGoal: number;
  restCountsForStreak: boolean;
  onboarded: boolean;
  startDate: string;
  notif: NotificationSettings;
}

export interface AIReport {
  month: string;
  generatedAt: number;
  summary: string;
  highlights: string[];
  cautions: string[];
  suggestions: string[];
  source?: "ai" | "template";
}
