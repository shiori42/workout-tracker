import type { AppData } from "./store";
import { BODY_PARTS, EQUIPMENT, INTENSITY, MEAL_TYPES } from "./constants";
import { bodyWeightAt, calcBmi, sessionDurationMinutes, sessionKcal, sortedBody } from "./calc";
import { fmtDateTime } from "./date";

type Cell = string | number | undefined | null;

function toCsv(rows: Cell[][]) {
  const esc = (v: Cell) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Excel で文字化けしないよう BOM を付ける
  return "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

export function workoutCsv(d: AppData) {
  const rows: Cell[][] = [
    ["日付", "開始", "種目", "部位", "器具", "強度", "セット", "重量(kg)", "回数", "完了", "ワークアウト時間(分)", "推定消費(kcal)", "メモ"],
  ];
  for (const s of [...d.sessions].filter((x) => x.completed).sort((a, b) => a.startAt - b.startAt)) {
    const minutes = Math.round(sessionDurationMinutes(s));
    const kcal = Math.round(sessionKcal(s, bodyWeightAt(d.bodyRecords, s.date)));
    s.exercises.forEach((e, ei) =>
      e.sets.forEach((x, i) =>
        rows.push([
          s.date,
          fmtDateTime(s.startAt),
          e.name,
          BODY_PARTS[e.bodyPart],
          EQUIPMENT[e.equipment],
          INTENSITY[e.intensity],
          i + 1,
          x.weight || "",
          x.reps,
          x.done ? "○" : "",
          ei === 0 && i === 0 ? minutes : "",
          ei === 0 && i === 0 ? kcal : "",
          i === 0 ? e.memo : "",
        ]),
      ),
    );
  }
  return toCsv(rows);
}

export function mealCsv(d: AppData) {
  const rows: Cell[][] = [["日付", "区分", "食品名", "量", "kcal", "たんぱく質(g)", "脂質(g)", "炭水化物(g)", "メモ"]];
  for (const m of [...d.meals].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))) {
    rows.push([m.date, MEAL_TYPES[m.mealType], m.foodName, m.amount, m.kcal, m.proteinG, m.fatG, m.carbG, m.note]);
  }
  for (const x of d.extraBurns) rows.push([x.date, "追加消費", x.label, "", -x.kcal, "", "", "", ""]);
  return toCsv(rows);
}

export function bodyCsv(d: AppData) {
  const rows: Cell[][] = [["日付", "身長(cm)", "体重(kg)", "BMI", "体脂肪率(%)", "筋肉量(kg)", "ウエスト(cm)", "写真枚数", "メモ"]];
  for (const r of sortedBody(d.bodyRecords)) {
    rows.push([r.date, r.heightCm, r.weightKg, calcBmi(r.heightCm, r.weightKg), r.bodyFatPct, r.muscleKg, r.waistCm, r.photos.length, r.note]);
  }
  return toCsv(rows);
}

export function downloadText(text: string, filename: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
