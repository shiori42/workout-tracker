"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/lib/store";
import type { MealRecord, MealType } from "@/lib/types";
import { MEAL_TYPES } from "@/lib/constants";
import { dayBurn, dayIntake } from "@/lib/calc";
import { addDays, addMonths, fmtDate, fmtDateLong, monthOf, weekKey, ymd } from "@/lib/date";
import { deletePhoto, savePhoto } from "@/lib/photos";
import { toast } from "@/lib/toast";
import type { AppData } from "@/lib/store";
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
  Sheet,
  TextArea,
} from "@/components/ui";
import { CameraIcon, ChevronLeft, ChevronRight, PlusIcon, TrashIcon } from "@/components/Icons";
import { PhotoView } from "@/components/PhotoView";
import { FoodPicker } from "@/components/FoodPicker";

export default function MealsPage() {
  return (
    <Suspense>
      <MealsInner />
    </Suspense>
  );
}

type MealDraft = Omit<MealRecord, "id" | "createdAt"> & { id?: string; file?: File | null };

function MealsInner() {
  const params = useSearchParams();
  const data = useApp();
  const today = ymd();
  const [date, setDate] = useState(params.get("date") || today);
  const [draft, setDraftState] = useState<MealDraft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const setDraft = (d: MealDraft | null) => {
    if (!d) setPickerOpen(false);
    setDraftState(d);
  };
  const [extraOpen, setExtraOpen] = useState(false);
  const [extra, setExtra] = useState({ label: "ウォーキング", kcal: 100 });

  const meals = data.meals.filter((m) => m.date === date).sort((a, b) => a.createdAt - b.createdAt);
  const intake = dayIntake(data, date);
  const burn = dayBurn(data, date);
  const extras = data.extraBurns.filter((x) => x.date === date);
  const pfc = meals.reduce(
    (a, m) => ({
      p: a.p + (m.proteinG ?? 0),
      f: a.f + (m.fatG ?? 0),
      c: a.c + (m.carbG ?? 0),
      kcal: a.kcal + (m.proteinG ?? 0) * 4 + (m.fatG ?? 0) * 9 + (m.carbG ?? 0) * 4,
      has: a.has || m.proteinG !== undefined || m.fatG !== undefined || m.carbG !== undefined,
    }),
    { p: 0, f: 0, c: 0, kcal: 0, has: false },
  );

  const newDraft = (mealType: MealType): MealDraft => ({
    date,
    mealType,
    foodName: "",
    amount: "",
    kcal: 0,
    note: "",
  });

  const save = async () => {
    if (!draft) return;
    let photoKey = draft.photoKey;
    if (draft.file) {
      if (photoKey) await deletePhoto(photoKey);
      photoKey = await savePhoto(draft.file, "meal");
    } else if (draft.file === null && photoKey) {
      await deletePhoto(photoKey);
      photoKey = undefined;
    }
    const { id, file, ...rest } = draft;
    void file;
    if (id) data.updateMeal(id, { ...rest, photoKey });
    else data.addMeal({ ...rest, photoKey });
    toast("食事を記録しました", `${rest.foodName} ${rest.kcal}kcal`, "🍚");
    setDraft(null);
  };

  return (
    <div>
      <PageHeader title="食事・カロリー" back />
      <div className="space-y-3 px-4 pt-3">
        <div className="flex items-center justify-between rounded-2xl bg-card p-2">
          <button aria-label="前日" onClick={() => setDate(addDays(date, -1))} className="grid h-10 w-10 place-items-center rounded-xl bg-card2">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <div className="text-sm font-bold">{fmtDateLong(date)}</div>
            {date !== today && (
              <button onClick={() => setDate(today)} className="text-[11px] font-bold text-accent">
                今日に戻る
              </button>
            )}
          </div>
          <button
            aria-label="翌日"
            disabled={date >= today}
            onClick={() => setDate(addDays(date, 1))}
            className="grid h-10 w-10 place-items-center rounded-xl bg-card2 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <Card>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[11px] text-muted">摂取カロリー</div>
              <div className="text-2xl font-extrabold tabular-nums">{intake}</div>
              <div className="text-[10px] text-muted">kcal</div>
            </div>
            <div>
              <div className="text-[11px] text-muted">運動消費</div>
              <div className="text-2xl font-extrabold tabular-nums">{Math.round(burn.total)}</div>
              <div className="text-[10px] text-muted">kcal（概算）</div>
            </div>
            <div>
              <div className="text-[11px] text-muted">収支</div>
              <div className="text-2xl font-extrabold tabular-nums text-accent2">{intake - Math.round(burn.total)}</div>
              <div className="text-[10px] text-muted">摂取−消費</div>
            </div>
          </div>
          {pfc.has && (
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line/60 pt-3 text-center">
              {(
                [
                  ["たんぱく質", pfc.p, 4, "text-ok"],
                  ["脂質", pfc.f, 9, "text-yellow-300"],
                  ["炭水化物", pfc.c, 4, "text-sky-300"],
                ] as const
              ).map(([label, g, k, color]) => (
                <div key={label}>
                  <div className="text-[10px] text-muted">{label}</div>
                  <div className={`text-base font-extrabold tabular-nums ${color}`}>
                    {Math.round(g * 10) / 10}
                    <span className="text-[10px] text-muted">g</span>
                  </div>
                  <div className="text-[10px] text-muted">{pfc.kcal > 0 ? Math.round(((g * k) / pfc.kcal) * 100) : 0}%</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {(Object.keys(MEAL_TYPES) as MealType[]).map((type) => {
          const list = meals.filter((m) => m.mealType === type);
          const sum = list.reduce((a, m) => a + m.kcal, 0);
          return (
            <Card
              key={type}
              title={
                <span className="flex items-center gap-2">
                  {MEAL_TYPES[type]}
                  {sum > 0 && <Badge color="accent">{sum}kcal</Badge>}
                </span>
              }
              action={
                <button
                  onClick={() => setDraft(newDraft(type))}
                  className="flex h-8 items-center gap-1 rounded-lg bg-card2 px-2.5 text-xs font-bold text-accent"
                >
                  <PlusIcon size={14} /> 追加
                </button>
              }
            >
              {list.length === 0 ? (
                <p className="text-xs text-muted">記録なし</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => setDraft({ ...m })}
                        className="flex w-full items-center gap-3 rounded-xl bg-card2 p-2 text-left active:bg-line"
                      >
                        {m.photoKey ? (
                          <PhotoView photoKey={m.photoKey} alt={m.foodName} className="h-12 w-12 shrink-0 rounded-lg" />
                        ) : (
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-bg text-xl">🍽️</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{m.foodName}</span>
                          <span className="block truncate text-[11px] text-muted">
                            {m.amount}
                            {m.proteinG !== undefined && ` ・ P${m.proteinG}g`}
                            {m.note && ` ・ ${m.note}`}
                          </span>
                        </span>
                        <span className="text-sm font-extrabold tabular-nums">{m.kcal}<span className="text-[10px] text-muted">kcal</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}

        <Card
          title="その他の運動（手動補正）"
          action={
            <button
              onClick={() => setExtraOpen(true)}
              className="flex h-8 items-center gap-1 rounded-lg bg-card2 px-2.5 text-xs font-bold text-accent"
            >
              <PlusIcon size={14} /> 追加
            </button>
          }
        >
          <div className="mb-2 text-xs text-muted">
            筋トレ（概算）：{Math.round(burn.training)}kcal
          </div>
          {extras.length === 0 ? (
            <p className="text-xs text-muted">ウォーキングなどアプリ外の運動を追加できます</p>
          ) : (
            <ul className="space-y-1.5">
              {extras.map((x) => (
                <li key={x.id} className="flex items-center justify-between rounded-lg bg-card2 px-3 py-2 text-sm">
                  <span>{x.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold tabular-nums">{x.kcal}kcal</span>
                    <button aria-label="削除" onClick={() => data.deleteExtraBurn(x.id)} className="text-muted">
                      <TrashIcon size={16} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <TrendCard data={data} />
      </div>

      {draft && (
        <Sheet
          open
          onClose={() => setDraft(null)}
          title={draft.id ? "食事を編集" : "食事を記録"}
          footer={
            <div className="flex gap-2">
              {draft.id && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (draft.photoKey) await deletePhoto(draft.photoKey);
                    data.deleteMeal(draft.id!);
                    setDraft(null);
                  }}
                >
                  <TrashIcon size={16} />
                </Button>
              )}
              <Button size="lg" className="flex-1" disabled={!draft.foodName.trim()} onClick={save}>
                保存
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Segmented
              value={draft.mealType}
              onChange={(v) => setDraft({ ...draft, mealType: v })}
              options={(Object.keys(MEAL_TYPES) as MealType[]).map((k) => ({ value: k, label: MEAL_TYPES[k] }))}
            />
            {pickerOpen ? (
              <FoodPicker
                onClose={() => setPickerOpen(false)}
                onPick={(f) => {
                  setDraft({
                    ...draft,
                    foodName: f.brand ? `${f.name}（${f.brand}）` : f.name,
                    amount: f.amount,
                    kcal: f.kcal,
                    proteinG: f.proteinG,
                    fatG: f.fatG,
                    carbG: f.carbG,
                  });
                  setPickerOpen(false);
                }}
              />
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setPickerOpen(true)}>
                🔍 食品を検索 / バーコードで入力
              </Button>
            )}
            <Field label="料理・食品名">
              <Input value={draft.foodName} onChange={(e) => setDraft({ ...draft, foodName: e.target.value })} placeholder="例：鶏むね肉のサラダ" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="量">
                <Input value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="例：200g、1食" />
              </Field>
              <Field label="カロリー(kcal)">
                <NumberInput value={draft.kcal} onChange={(v) => setDraft({ ...draft, kcal: Math.round(v) })} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["proteinG", "たんぱく質(g)"],
                  ["fatG", "脂質(g)"],
                  ["carbG", "炭水化物(g)"],
                ] as const
              ).map(([k, label]) => (
                <Field key={k} label={label}>
                  <NumberInput
                    value={draft[k] ?? ""}
                    placeholder="任意"
                    step={0.1}
                    onChange={(v) => setDraft({ ...draft, [k]: v > 0 ? Math.round(v * 10) / 10 : undefined })}
                  />
                </Field>
              ))}
            </div>
            <Field label="写真（任意）">
              <MealPhotoInput draft={draft} setDraft={setDraft} />
            </Field>
            <Field label="メモ">
              <TextArea rows={2} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="プロテイン、水分、体調など" />
            </Field>
          </div>
        </Sheet>
      )}

      <Sheet
        open={extraOpen}
        onClose={() => setExtraOpen(false)}
        title="その他の運動を追加"
        footer={
          <Button
            size="lg"
            className="w-full"
            disabled={!extra.label.trim() || extra.kcal <= 0}
            onClick={() => {
              data.addExtraBurn({ date, label: extra.label.trim(), kcal: extra.kcal });
              setExtraOpen(false);
            }}
          >
            追加
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="内容">
            <Input value={extra.label} onChange={(e) => setExtra({ ...extra, label: e.target.value })} />
          </Field>
          <Field label="消費カロリー(kcal)">
            <NumberInput value={extra.kcal} onChange={(v) => setExtra({ ...extra, kcal: Math.round(v) })} />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {[
              ["ウォーキング30分", 100],
              ["ジョギング30分", 250],
              ["サイクリング30分", 180],
              ["ストレッチ15分", 30],
            ].map(([l, k]) => (
              <button
                key={l}
                onClick={() => setExtra({ label: String(l), kcal: Number(k) })}
                className="h-8 rounded-full bg-card2 px-3 text-xs font-bold"
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function MealPhotoInput({
  draft,
  setDraft,
}: {
  draft: MealDraft;
  setDraft: (d: MealDraft) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const hasExisting = draft.photoKey && draft.file !== null && !draft.file;
  return (
    <div className="flex items-center gap-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-20 w-20 rounded-xl object-cover" />
      ) : hasExisting ? (
        <PhotoView photoKey={draft.photoKey!} alt="" className="h-20 w-20 rounded-xl" />
      ) : (
        <span className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-line text-muted">
          <CameraIcon />
        </span>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-card2 px-3 text-xs font-bold">
          写真を選択
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setPreview(URL.createObjectURL(f));
              setDraft({ ...draft, file: f });
            }}
          />
        </label>
        {(preview || hasExisting) && (
          <button
            type="button"
            className="text-left text-xs font-bold text-red-400"
            onClick={() => {
              setPreview(null);
              setDraft({ ...draft, file: null });
            }}
          >
            写真を削除
          </button>
        )}
      </div>
    </div>
  );
}

type Range = "day" | "week" | "month";

function TrendCard({ data }: { data: AppData }) {
  const [range, setRange] = useState<Range>("day");
  const today = ymd();

  const rows = (() => {
    if (range === "day") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = addDays(today, i - 6);
        return { label: fmtDate(d).replace(/\(.\)/, ""), 摂取: dayIntake(data, d), 消費: Math.round(dayBurn(data, d).total) };
      });
    }
    if (range === "week") {
      const thisWeek = weekKey(today);
      return Array.from({ length: 6 }, (_, i) => {
        const start = addDays(thisWeek, (i - 5) * 7);
        let intake = 0;
        let burn = 0;
        for (let k = 0; k < 7; k++) {
          const d = addDays(start, k);
          if (d > today) break;
          intake += dayIntake(data, d);
          burn += dayBurn(data, d).total;
        }
        return { label: fmtDate(start).replace(/\(.\)/, "") + "〜", 摂取: intake, 消費: Math.round(burn) };
      });
    }
    return Array.from({ length: 6 }, (_, i) => {
      const m = addMonths(monthOf(today), i - 5);
      const intake = data.meals.filter((x) => monthOf(x.date) === m).reduce((a, x) => a + x.kcal, 0);
      const dates = new Set([...data.sessions.map((s) => s.date), ...data.extraBurns.map((x) => x.date)]);
      let burn = 0;
      dates.forEach((d) => {
        if (monthOf(d) === m) burn += dayBurn(data, d).total;
      });
      return { label: `${Number(m.slice(5))}月`, 摂取: intake, 消費: Math.round(burn) };
    });
  })();

  const hasAny = rows.some((r) => r.摂取 > 0 || r.消費 > 0);

  return (
    <Card title="摂取・消費の推移">
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: "day", label: "日" },
          { value: "week", label: "週" },
          { value: "month", label: "月" },
        ]}
        className="mb-3"
      />
      {hasAny ? (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#2c2c39" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#9a9aab", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9a9aab", fontSize: 10 }} />
              <Tooltip
                cursor={{ fill: "#ffffff08" }}
                contentStyle={{ background: "#16161d", border: "1px solid #2c2c39", borderRadius: 12, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="摂取" fill="#ffb020" radius={[4, 4, 0, 0]} />
              <Bar dataKey="消費" fill="#ff6b2c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty>記録が増えるとグラフが表示されます</Empty>
      )}
    </Card>
  );
}
