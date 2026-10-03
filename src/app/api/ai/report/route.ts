import { NextResponse } from "next/server";
import type { ReportInput } from "@/lib/calc";
import { requireUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const apiKey = () => process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
const baseUrl = () => (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const model = () => process.env.AI_MODEL || "gpt-4o-mini";

const SYSTEM = `あなたは自宅で筋トレを続ける個人ユーザー向けのトレーニングコーチです。
渡される月間集計データ（JSON）だけを根拠に、日本語で月次レポートを作成してください。
制約:
- 医療的な診断・病気の推定・治療の助言はしない。疲労度はあくまで推定値として扱う。
- 数値は入力データにあるものだけを使い、推測で数値を作らない。
- 前向きで具体的に。各項目は1〜2文。
- 出力は次のJSONのみ: {"summary": string, "highlights": string[], "cautions": string[], "suggestions": string[]}
- summary は継続状況・総セット数・推定消費カロリー・体重/BMI推移を含む3文以内。
- highlights（良かった点・伸びた項目）2〜4件、cautions（部位の偏り・休養の目安）1〜3件、suggestions（翌月の提案）2〜4件。`;

const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

export function GET() {
  return NextResponse.json({ enabled: !!apiKey(), model: apiKey() ? model() : null });
}

export async function POST(req: Request) {
  if (!apiKey()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const denied = await requireUser(req);
  if (denied) return denied;

  let input: ReportInput;
  try {
    input = (await req.json()) as ReportInput;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!input || typeof input.month !== "string" || !/^\d{4}-\d{2}$/.test(input.month) || !input.current) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // 想定外のフィールド（自由記述など）が送られても外部AIへ渡さないよう、許可した項目だけ再構成する
  const pick = (m: ReportInput["current"]) => ({
    trainingDays: Number(m?.trainingDays) || 0,
    sessions: Number(m?.sessions) || 0,
    totalSets: Number(m?.totalSets) || 0,
    totalReps: Number(m?.totalReps) || 0,
    volumeKg: Number(m?.volumeKg) || 0,
    kcal: Number(m?.kcal) || 0,
    goal: Number(m?.goal) || 0,
    goalRatePct: Number(m?.goalRatePct) || 0,
    exerciseKinds: Number(m?.exerciseKinds) || 0,
    plannedDays: Number(m?.plannedDays) || 0,
    plannedDone: Number(m?.plannedDone) || 0,
    partSets: Object.fromEntries(
      Object.entries(m?.partSets ?? {})
        .slice(0, 12)
        .map(([k, v]) => [String(k).slice(0, 20), Number(v) || 0]),
    ),
    weightKg: m?.weightKg ?? null,
    bmi: m?.bmi ?? null,
    avgIntakeKcal: m?.avgIntakeKcal ?? null,
  });
  const safe = {
    month: input.month,
    current: pick(input.current),
    previous: pick(input.previous),
    streakDays: Number(input.streakDays) || 0,
    bestStreakDays: Number(input.bestStreakDays) || 0,
    fatigueTop: (input.fatigueTop ?? []).slice(0, 6).map((f) => ({ muscle: String(f.muscle).slice(0, 20), score: Number(f.score) || 0 })),
    progress: (input.progress ?? []).slice(0, 8).map((p) => ({
      exercise: String(p.exercise).slice(0, 40),
      previousBest: Number(p.previousBest) || 0,
      currentBest: Number(p.currentBest) || 0,
      unit: p.unit === "kg" ? "kg" : "回",
    })),
  };

  try {
    const res = await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
      body: JSON.stringify({
        model: model(),
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: JSON.stringify(safe) },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.error("[ai] upstream error", res.status, (await res.text()).slice(0, 300));
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, "")) as Record<string, unknown>;
    if (typeof parsed.summary !== "string" || !isStrArr(parsed.highlights) || !isStrArr(parsed.cautions) || !isStrArr(parsed.suggestions)) {
      return NextResponse.json({ error: "invalid_ai_output" }, { status: 502 });
    }
    return NextResponse.json({
      report: {
        summary: parsed.summary,
        highlights: parsed.highlights.slice(0, 6),
        cautions: parsed.cautions.slice(0, 5),
        suggestions: parsed.suggestions.slice(0, 6),
      },
      model: model(),
    });
  } catch (e) {
    console.error("[ai] failed", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
