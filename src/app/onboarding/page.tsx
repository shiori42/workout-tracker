"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cloudEnabled } from "@/lib/supabase";
import { useApp } from "@/lib/store";
import { calcBmi, bmiLabel } from "@/lib/calc";
import { GOAL_PRESETS, SAMPLE_TEMPLATES } from "@/lib/constants";
import { WEEKDAYS, ymd } from "@/lib/date";
import { requestNotificationPermission } from "@/lib/notify";
import { Button, Field, Input, NumberInput, Select, Toggle, cx } from "@/components/ui";

const STEPS = ["ようこそ", "プロフィール", "目標", "メニュー", "スケジュール"];

export default function OnboardingPage() {
  const data = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState(data.settings.nickname);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [goal, setGoal] = useState(data.settings.monthlyGoal);
  const [menuChoice, setMenuChoice] = useState<"sample" | "self" | null>(null);
  const [notifTime, setNotifTime] = useState(data.settings.notif.training.time);
  const [notifOn, setNotifOn] = useState(true);

  const bmi = calcBmi(height, weight);

  const finish = async () => {
    const today = ymd();
    data.updateSettings({ nickname: nickname.trim(), monthlyGoal: goal, onboarded: true, startDate: today });
    data.updateNotif("training", { enabled: notifOn, time: notifTime });
    if (height > 0 && weight > 0 && data.bodyRecords.length === 0) {
      data.upsertBodyRecord({ date: today, heightCm: height, weightKg: weight, photos: [], note: "開始時" });
    }
    if (notifOn) await requestNotificationPermission();
    router.replace(menuChoice === "self" ? "/menu" : "/");
  };

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+20px)]">
      {step > 0 && (
        <div className="mb-6 flex gap-1.5">
          {STEPS.slice(1).map((_, i) => (
            <div key={i} className={cx("h-1.5 flex-1 rounded-full", i < step ? "bg-accent" : "bg-card2")} />
          ))}
        </div>
      )}

      <div className="flex-1">
        {step === 0 && (
          <div className="flex h-full flex-col items-center justify-center pt-16 text-center">
            <div className="grid h-28 w-28 place-items-center rounded-[2rem] bg-gradient-to-br from-accent to-accent2 text-6xl shadow-[0_20px_60px_-12px] shadow-accent/70">
              💪
            </div>
            <h1 className="mt-8 text-2xl font-extrabold">筋トレ管理アプリへようこそ</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              トレーニング・タイマー・身体記録・食事・カロリーを
              <br />
              ひとつのアプリで「記録する・続ける・振り返る」
            </p>
            <ul className="mt-8 w-full space-y-2 text-left text-sm">
              {[
                ["📝", "メニューと重量・回数・セットを記録"],
                ["⏱️", "セット完了で自動インターバル"],
                ["📊", "筋肉疲労度・月間分析・AIレポート"],
                ["📸", "月1回の身体記録と写真比較"],
              ].map(([i, t]) => (
                <li key={t} className="flex items-center gap-3 rounded-xl bg-card px-4 py-3">
                  <span className="text-xl">{i}</span>
                  {t}
                </li>
              ))}
            </ul>
            {cloudEnabled && (
              <Link href="/login" className="mt-5 text-sm font-bold text-accent underline underline-offset-4">
                アカウントをお持ちの方：ログインしてデータを復元
              </Link>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Heading title="プロフィール登録" sub="BMIの算出と消費カロリーの概算に使います" />
            <Field label="ニックネーム（任意）">
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="例：たろう" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="身長(cm)">
                <NumberInput value={height} step={0.1} onChange={setHeight} className="h-14 text-center text-xl font-bold" />
              </Field>
              <Field label="体重(kg)">
                <NumberInput value={weight} step={0.1} onChange={setWeight} className="h-14 text-center text-xl font-bold" />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-4">
              <span className="text-sm font-bold text-muted">BMI</span>
              <span>
                <span className="text-3xl font-extrabold tabular-nums">{bmi || "-"}</span>
                <span className="ml-2 text-xs text-muted">{bmiLabel(bmi)}</span>
              </span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <Heading title="月間トレーニング目標" sub="1か月に何回トレーニングするかを決めましょう" />
            <div className="grid grid-cols-2 gap-3">
              {GOAL_PRESETS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={cx(
                    "rounded-2xl border-2 p-4 text-left transition",
                    goal === g ? "border-accent bg-accent/10" : "border-transparent bg-card",
                  )}
                >
                  <div className="text-3xl font-extrabold">
                    {g}
                    <span className="text-sm text-muted">回/月</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">週{Math.round(g / 4)}回ペース</div>
                </button>
              ))}
            </div>
            <Field label="自由入力">
              <NumberInput value={goal} min={1} onChange={(v) => setGoal(Math.max(1, Math.min(31, Math.round(v))))} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Heading title="メニュー作成" sub="サンプルから始めて、あとで自由に編集できます" />
            <button
              onClick={() => setMenuChoice("sample")}
              className={cx(
                "w-full rounded-2xl border-2 p-4 text-left transition",
                menuChoice === "sample" ? "border-accent bg-accent/10" : "border-transparent bg-card",
              )}
            >
              <div className="font-bold">✨ 自宅トレ向けサンプルを使う</div>
              <div className="mt-1 text-xs text-muted">ダンベル・腹筋ローラー・ハンドグリップ・自重の12種目</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {SAMPLE_TEMPLATES.map((t) => (
                  <span key={t.name} className="rounded-md bg-card2 px-2 py-0.5 text-[11px] font-bold">
                    {t.name}
                  </span>
                ))}
              </div>
            </button>
            <button
              onClick={() => setMenuChoice("self")}
              className={cx(
                "w-full rounded-2xl border-2 p-4 text-left transition",
                menuChoice === "self" ? "border-accent bg-accent/10" : "border-transparent bg-card",
              )}
            >
              <div className="font-bold">📝 自分で作成する</div>
              <div className="mt-1 text-xs text-muted">完了後にメニュー管理画面を開きます</div>
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <Heading title="曜日・通知の設定" sub="曜日ごとのメニューと通知時刻を決めましょう" />
            {data.templates.length > 0 ? (
              <div className="space-y-2 rounded-2xl bg-card p-4">
                {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
                  <div key={wd} className="flex items-center gap-3">
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
                      options={[
                        { value: "__none", label: "未設定" },
                        { value: "rest", label: "🛌 休養日" },
                        ...data.templates.map((t) => ({ value: t.id, label: t.name })),
                      ]}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-card p-4 text-sm text-muted">
                メニュー作成後に「メニュー管理 → 曜日スケジュール」から設定できます。
              </p>
            )}
            <div className="rounded-2xl bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">トレーニング予定の通知</div>
                  <div className="text-[11px] text-muted">「今日は胸の日」などをお知らせ</div>
                </div>
                <Toggle checked={notifOn} onChange={setNotifOn} />
              </div>
              {notifOn && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted">通知時刻</span>
                  <input
                    type="time"
                    value={notifTime}
                    onChange={(e) => e.target.value && setNotifTime(e.target.value)}
                    className="h-10 rounded-lg border border-line bg-card2 px-3 text-white outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-2">
        {step > 0 && (
          <Button variant="secondary" size="lg" onClick={back} className="w-28">
            戻る
          </Button>
        )}
        {step === 0 && (
          <Button size="lg" className="flex-1" onClick={next}>
            はじめる
          </Button>
        )}
        {step === 1 && (
          <Button size="lg" className="flex-1" disabled={!height || !weight} onClick={next}>
            次へ
          </Button>
        )}
        {step === 2 && (
          <Button size="lg" className="flex-1" onClick={next}>
            次へ
          </Button>
        )}
        {step === 3 && (
          <Button
            size="lg"
            className="flex-1"
            disabled={!menuChoice}
            onClick={() => {
              if (menuChoice === "sample") data.loadSamples();
              next();
            }}
          >
            次へ
          </Button>
        )}
        {step === 4 && (
          <Button size="lg" className="flex-1" onClick={finish}>
            ホームへ
          </Button>
        )}
      </div>
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </div>
  );
}
