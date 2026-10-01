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
  defaultWeight: number;
  defaultReps: number;
  defaultSets: number;
  restSec: number;
  intensity: Intensity;
  memo: string;
  createdAt: number;
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
}
