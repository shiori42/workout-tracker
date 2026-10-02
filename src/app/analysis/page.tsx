"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/lib/store";
import type { AIReport, BodyPart, Muscle } from "@/lib/types";
import {
  bestStreak,
  buildReportInput,
  bodyWeightAt,
  calcBmi,
  changeRate,
  computeFatigue,
  currentStreak,
  dayBurn,
  dayIntake,
  fatigueColor,
  generateReport,
  monthStats,
  recoveryLabel,
  sessionKcalBreakdown,
  sessionKcal,
  sortedBody,
} from "@/lib/calc";
import { BODY_PARTS, INTENSITY, MUSCLES } from "@/lib/constants";
import {
  addDays,
  addMonths,
  daysInMonth,
  fmtDate,
  fmtDateTime,
  fmtMinutes,
  fmtMonth,
  monthOf,
  pad,
  weekKey,
  ymd,
} from "@/lib/date";
import { BodyMap } from "@/components/BodyMap";
import { Badge, Button, Card, Empty, PageHeader, ProgressBar, Segmented, Stat, cx } from "@/components/ui";
import { ChevronLeft, ChevronRight, SparkIcon } from "@/components/Icons";
import { toast } from "@/lib/toast";

const tooltipStyle = {
  background: "#16161d",
  border: "1px solid #2c2c39",
  borderRadius: 12,
  fontSize: 12,
};

export default function AnalysisPage() {
  const data = useApp();
  const today = ymd();
  const [month, setMonth] = useState(monthOf(today));
  const prevMonth = addMonths(month, -1);
  const cur = monthStats(data, month, today);
  const prev = monthStats(data, prevMonth, today);

  return (
    <div>
      <PageHeader title="分析" />
      <div className="space-y-3 px-4 pt-3">
        <FatigueSection />

        <div className="sticky top-14 z-10 -mx-4 bg-bg/95 px-4 py-2 backdrop-blur">
          <div className="flex items-center justify-between rounded-2xl bg-card p-1.5">
            <button aria-label="前の月" onClick={() => setMonth(addMonths(month, -1))} className="grid h-9 w-9 place-items-center rounded-xl bg-card2">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-extrabold">{fmtMonth(month)}</span>
            <button
              aria-label="次の月"
              disabled={month >= monthOf(today)}
              onClick={() => setMonth(addMonths(month, 1))}
              className="grid h-9 w-9 place-items-center rounded-xl bg-card2 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <MonthSection stats={cur} />
        <KcalSection month={month} />
        <CompareSection cur={cur} prev={prev} prevLabel={fmtMonth(prevMonth)} />
        <ReportSection month={month} />
        <HealthSection />
      </div>
    </div>
  );
}

/* ---------------- 人体模型・疲労度 ---------------- */

function FatigueSection() {
  const sessions = useApp((s) => s.sessions);
  const exercises = useApp((s) => s.exercises);
  const fatigue = useMemo(() => computeFatigue(sessions, undefined, exercises), [sessions, exercises]);
  const [selected, setSelected] = useState<Muscle | null>(null);
  const sel = selected ? fatigue[selected] : null;
  const ranking = (Object.entries(fatigue) as [Muscle, (typeof fatigue)[Muscle]][])
    .filter(([, f]) => f.score > 0)
    .sort((a, b) => b[1].score - a[1].score);

  return (
    <Card title="筋肉疲労度" action={<Badge color="warn">参考値</Badge>}>
      <BodyMap fatigue={fatigue} selected={selected} onSelect={setSelected} />

      {sel && selected ? (
        <div className="mt-3 rounded-xl bg-card2 p-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold">{MUSCLES[selected]}</span>
            <span className="text-2xl font-extrabold tabular-nums" style={{ color: sel.score > 0 ? fatigueColor(sel.score) : undefined }}>
              {sel.score}
              <span className="text-xs text-muted"> /100</span>
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted">最終トレーニング</div>
              <div className="font-bold">{sel.lastAt ? fmtDateTime(sel.lastAt) : "記録なし"}</div>
            </div>
            <div>
              <div className="text-muted">直近7日のセット数</div>
              <div className="font-bold">{sel.sets7}セット</div>
            </div>
            <div className="col-span-2">
              <div className="text-muted">主な種目</div>
              <div className="font-bold">
                {sel.exercises.length > 0 ? sel.exercises.map((e) => `${e.name}(${e.sets})`).join("、") : "-"}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-muted">推定回復状況</div>
              <div className="font-bold">{recoveryLabel(sel.score)}</div>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-muted">部位をタップすると詳細を表示します</p>
      )}

      {ranking.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {ranking.slice(0, 5).map(([m, f]) => (
            <li key={m}>
              <button onClick={() => setSelected(m)} className="flex w-full items-center gap-2 text-xs">
                <span className="w-24 truncate text-left font-bold">{MUSCLES[m]}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-card2">
                  <span className="block h-full rounded-full" style={{ width: `${f.score}%`, background: fatigueColor(f.score) }} />
                </span>
                <span className="w-8 text-right tabular-nums">{f.score}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-muted">
        ※ 直近のセット数・回数・重量・対象筋の寄与率・経過時間から算出した概算値です。医療的な筋損傷・回復の判定ではなく、トレーニング配分の参考としてご利用ください。
      </p>
    </Card>
  );
}

/* ---------------- 月間状況 ---------------- */

function MonthSection({ stats }: { stats: ReturnType<typeof monthStats> }) {
  const data = useApp();
  const streak = currentStreak(data);
  const best = bestStreak(data);
  const partData = (Object.entries(stats.partSets) as [BodyPart, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => ({ name: BODY_PARTS[k], sets: n }));

  return (
    <Card title="月間トレーニング状況">
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs">
          <span className="font-bold">月間目標の達成率</span>
          <span className="font-bold text-accent">
            {stats.trainingDays}/{stats.goal}回（{Math.round(stats.goalRate * 100)}%）
          </span>
        </div>
        <ProgressBar value={stats.goalRate} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="トレーニング日数" value={stats.trainingDays} unit="日" />
        <Stat label="実施回数" value={stats.sessions} unit="回" />
        <Stat label="総セット数" value={stats.totalSets} unit="set" />
        <Stat label="種目数" value={stats.exerciseKinds} unit="種目" />
        <Stat label="連続日数" value={streak} unit="日" />
        <Stat label="最高ストリーク" value={best} unit="日" />
      </div>
      {stats.plannedDays > 0 && (
        <p className="mt-2 text-[11px] text-muted">
          予定どおりの実施：{stats.plannedDone}/{stats.plannedDays}日
        </p>
      )}
      <div className="mt-4">
        <div className="mb-1 text-xs font-bold text-muted">部位別セット数</div>
        {partData.length === 0 ? (
          <Empty>この月の記録はまだありません</Empty>
        ) : (
          <div style={{ height: Math.max(120, partData.length * 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={partData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fill: "#d4d4dc", fontSize: 11 }} width={78} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tooltipStyle} />
                <Bar dataKey="sets" name="セット" fill="#ff6b2c" radius={[0, 6, 6, 0]} label={{ position: "right", fill: "#9a9aab", fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------------- 消費カロリー詳細 ---------------- */

type Range = "day" | "week" | "month";

function KcalSection({ month }: { month: string }) {
  const data = useApp();
  const today = ymd();
  const [range, setRange] = useState<Range>("day");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = (() => {
    if (range === "day") {
      const n = daysInMonth(month);
      return Array.from({ length: n }, (_, i) => {
        const d = `${month}-${pad(i + 1)}`;
        return { label: String(i + 1), kcal: d <= today ? Math.round(dayBurn(data, d).total) : 0 };
      });
    }
    if (range === "week") {
      const start = weekKey(`${month}-01`);
      const end = `${month}-${pad(daysInMonth(month))}`;
      const out: { label: string; kcal: number }[] = [];
      for (let w = start; w <= end; w = addDays(w, 7)) {
        let kcal = 0;
        for (let k = 0; k < 7; k++) kcal += dayBurn(data, addDays(w, k)).total;
        out.push({ label: fmtDate(w).replace(/\(.\)/, "") + "〜", kcal: Math.round(kcal) });
      }
      return out;
    }
    return Array.from({ length: 6 }, (_, i) => {
      const m = addMonths(month, i - 5);
      const s = monthStats(data, m, today);
      return { label: `${Number(m.slice(5))}月`, kcal: Math.round(s.kcal + s.extraKcal) };
    });
  })();

  const sessions = data.sessions
    .filter((s) => s.completed && monthOf(s.date) === month)
    .sort((a, b) => b.startAt - a.startAt);
  const total = rows.reduce((a, r) => a + r.kcal, 0);

  return (
    <Card title="消費カロリー詳細" action={<Badge color="warn">概算</Badge>}>
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: "day", label: "日別" },
          { value: "week", label: "週別" },
          { value: "month", label: "月別" },
        ]}
        className="mb-3"
      />
      <div className="mb-1 text-xs text-muted">
        {range === "month" ? "直近6か月" : fmtMonth(month)} 合計 <span className="text-base font-extrabold text-white">{total}</span> kcal
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#2c2c39" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#9a9aab", fontSize: 9 }} interval={range === "day" ? 4 : 0} />
            <YAxis tick={{ fill: "#9a9aab", fontSize: 10 }} />
            <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={tooltipStyle} formatter={(v) => [`${v} kcal`, "消費"]} />
            <Bar dataKey="kcal" radius={[4, 4, 0, 0]}>
              {rows.map((r, i) => (
                <Cell key={i} fill={r.kcal > 0 ? "#ff6b2c" : "#2c2c39"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 mb-1 text-xs font-bold text-muted">セッション別の内訳</div>
      {sessions.length === 0 ? (
        <Empty>この月のセッションはありません</Empty>
      ) : (
        <ul className="space-y-1.5">
          {sessions.map((s) => {
            const w = bodyWeightAt(data.bodyRecords, s.date);
            const items = sessionKcalBreakdown(s, w).filter((x) => x.kcal > 0);
            const open = openId === s.id;
            return (
              <li key={s.id} className="rounded-xl bg-card2">
                <button onClick={() => setOpenId(open ? null : s.id)} className="flex w-full items-center justify-between px-3 py-2.5 text-left">
                  <span>
                    <span className="block text-sm font-bold">{s.templateName}</span>
                    <span className="text-[11px] text-muted">{fmtDate(s.date)}</span>
                  </span>
                  <span className="text-sm font-extrabold tabular-nums">
                    {sessionKcal(s, w)}
                    <span className="text-[10px] text-muted">kcal {open ? "▲" : "▼"}</span>
                  </span>
                </button>
                {open && (
                  <ul className="space-y-1 border-t border-line/60 px-3 py-2">
                    {items.map((x) => (
                      <li key={x.uid} className="flex justify-between text-xs">
                        <span>
                          {x.name}
                          <span className="ml-1 text-muted">
                            {INTENSITY[x.intensity]}・{fmtMinutes(x.minutes)}
                          </span>
                        </span>
                        <span className="tabular-nums">{Math.round(x.kcal)}kcal</span>
                      </li>
                    ))}
                    {s.kcalOverride !== undefined && (
                      <li className="text-[11px] text-yellow-300">※ 手動修正値を表示しています</li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ---------------- 前月比 ---------------- */

function CompareSection({
  cur,
  prev,
  prevLabel,
}: {
  cur: ReturnType<typeof monthStats>;
  prev: ReturnType<typeof monthStats>;
  prevLabel: string;
}) {
  const rows: { label: string; cur?: number; prev?: number; unit: string; digits?: number; lowerBetter?: boolean }[] = [
    { label: "トレーニング回数", cur: cur.sessions, prev: prev.sessions, unit: "回" },
    { label: "トレーニング日数", cur: cur.trainingDays, prev: prev.trainingDays, unit: "日" },
    { label: "総セット数", cur: cur.totalSets, prev: prev.totalSets, unit: "set" },
    { label: "総負荷量", cur: cur.volume, prev: prev.volume, unit: "kg" },
    { label: "推定消費kcal", cur: Math.round(cur.kcal), prev: Math.round(prev.kcal), unit: "kcal" },
    { label: "体重", cur: cur.weight, prev: prev.weight, unit: "kg", digits: 1 },
    { label: "BMI", cur: cur.bmi, prev: prev.bmi, unit: "", digits: 1 },
  ];
  return (
    <Card title="前月比" action={<span className="text-[11px] text-muted">vs {prevLabel}</span>}>
      <ul className="divide-y divide-line/60">
        {rows.map((r) => {
          const has = r.cur !== undefined && r.prev !== undefined;
          const rate = has ? changeRate(r.cur!, r.prev!) : null;
          const neutral = r.label === "体重" || r.label === "BMI";
          return (
            <li key={r.label} className="flex items-center gap-2 py-2.5 text-sm">
              <span className="flex-1 text-xs font-bold text-white/80">{r.label}</span>
              <span className="w-16 text-right text-xs text-muted tabular-nums">
                {r.prev !== undefined ? r.prev.toLocaleString(undefined, { maximumFractionDigits: r.digits ?? 0 }) : "-"}
              </span>
              <span className="text-muted">→</span>
              <span className="w-20 text-right font-extrabold tabular-nums">
                {r.cur !== undefined ? r.cur.toLocaleString(undefined, { maximumFractionDigits: r.digits ?? 0 }) : "-"}
                <span className="ml-0.5 text-[10px] font-normal text-muted">{r.unit}</span>
              </span>
              <span
                className={cx(
                  "w-16 text-right text-xs font-bold tabular-nums",
                  rate === null || rate === 0 || neutral ? "text-muted" : rate > 0 ? "text-ok" : "text-red-400",
                )}
              >
                {rate === null ? (has ? "NEW" : "-") : `${rate > 0 ? "+" : ""}${rate.toFixed(1)}%`}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ---------------- AIレポート ---------------- */

function ReportSection({ month }: { month: string }) {
  const data = useApp();
  const report = data.reports[month];
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    const state = useApp.getState();
    let next: AIReport | null = null;
    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildReportInput(state, month)),
      });
      if (res.ok) {
        const json = (await res.json()) as { report: Pick<AIReport, "summary" | "highlights" | "cautions" | "suggestions"> };
        next = { ...json.report, month, generatedAt: Date.now(), source: "ai" };
      }
    } catch {
      /* オフライン等は定型レポートにフォールバック */
    }
    if (!next) next = { ...generateReport(state, month), source: "template" };
    state.saveReport(next);
    setBusy(false);
    toast(next.source === "ai" ? "AIレポートを生成しました" : "レポートを生成しました", fmtMonth(month), "✨");
  };

  return (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          <SparkIcon size={16} className="text-accent" /> AIレポート
        </span>
      }
      action={
        <Button
          size="sm"
          variant={report ? "secondary" : "primary"}
          disabled={busy}
          onClick={() => void generate()}
        >
          {busy ? "生成中…" : report ? "更新" : "生成"}
        </Button>
      }
    >
      {!report ? (
        <Empty>
          「生成」を押すと、{fmtMonth(month)}のトレーニング回数・セット数・消費カロリー・体重推移・部位の偏りなどを要約します。
        </Empty>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="leading-relaxed text-white/90">{report.summary}</p>
          <ReportList title="良かった点" icon="👍" items={report.highlights} color="text-ok" />
          <ReportList title="偏り・休養の注意点" icon="⚠️" items={report.cautions} color="text-yellow-300" />
          <ReportList title="翌月の提案" icon="🎯" items={report.suggestions} color="text-accent" />
          <p className="text-[10px] leading-relaxed text-muted">
            生成日時：{fmtDateTime(report.generatedAt)} ／{" "}
            {report.source === "ai"
              ? "外部AIで生成（送信したのは月間の集計値のみ。写真・メモ・ニックネームは送信していません）。"
              : "アプリ内の集計データから定型レポートを作成しています（外部AI未設定またはオフライン）。身体写真は利用しません。"}
            医療的な診断ではありません。
          </p>
        </div>
      )}
    </Card>
  );
}

function ReportList({ title, icon, items, color }: { title: string; icon: string; items: string[]; color: string }) {
  return (
    <div className="rounded-xl bg-card2 p-3">
      <div className={cx("mb-1.5 text-xs font-extrabold", color)}>
        {icon} {title}
      </div>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-white/85">
            <span className="text-muted">・</span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- ヘルスケア ---------------- */

function HealthSection() {
  const data = useApp();
  const today = ymd();
  const body = sortedBody(data.bodyRecords).map((r) => ({
    label: `${Number(r.date.slice(5, 7))}/${Number(r.date.slice(8))}`,
    weight: r.weightKg,
    bmi: calcBmi(r.heightCm, r.weightKg),
  }));
  const latest = body[body.length - 1];
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const avgIntake = Math.round(last7.reduce((a, d) => a + dayIntake(data, d), 0) / 7);
  const avgBurn = Math.round(last7.reduce((a, d) => a + dayBurn(data, d).total, 0) / 7);
  const last28 = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));
  const trainedSet = new Set(data.stamps.map((s) => s.date));
  const perWeek = Math.round((last28.filter((d) => trainedSet.has(d)).length / 4) * 10) / 10;

  return (
    <Card title="ヘルスケア">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="体重" value={latest?.weight ?? "-"} unit="kg" />
        <Stat label="BMI" value={latest?.bmi ?? "-"} />
        <Stat label="平均摂取（7日）" value={avgIntake} unit="kcal/日" />
        <Stat label="平均消費（7日）" value={avgBurn} unit="kcal/日" />
        <Stat label="運動頻度（4週平均）" value={perWeek} unit="回/週" className="col-span-2" />
      </div>
      <div className="mt-4 mb-1 text-xs font-bold text-muted">体重・BMIの推移</div>
      {body.length < 2 ? (
        <Empty>身体記録が2件以上になるとグラフを表示します</Empty>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={body} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#2c2c39" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#9a9aab", fontSize: 10 }} />
              <YAxis yAxisId="w" tick={{ fill: "#9a9aab", fontSize: 10 }} domain={["dataMin - 2", "dataMax + 2"]} />
              <YAxis yAxisId="b" orientation="right" hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line yAxisId="w" type="monotone" dataKey="weight" name="体重(kg)" stroke="#ff6b2c" strokeWidth={2} dot />
              <Line yAxisId="b" type="monotone" dataKey="bmi" name="BMI" stroke="#38bdf8" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-line p-3">
        <span className="text-2xl">❤️</span>
        <div className="flex-1">
          <div className="text-xs font-bold">外部ヘルスケア連携</div>
          <div className="text-[11px] text-muted">Apple Health / Google Health Connect との同期は将来対応予定です</div>
        </div>
        <Badge>準備中</Badge>
      </div>
    </Card>
  );
}
