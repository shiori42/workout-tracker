"use client";

import { MUSCLE_MAP, MUSCLES, SAMPLE_EXERCISES } from "@/lib/constants";
import { FORM_BASICS, FORM_GUIDES, type FormGuide } from "@/lib/formGuides";
import type { BodyPart, ExerciseGuide, Muscle } from "@/lib/types";
import { Badge, Sheet } from "@/components/ui";

const norm = (s: string) => s.replace(/\s|　/g, "");

const byName = new Map<string, FormGuide>();
for (const s of SAMPLE_EXERCISES) {
  const guide = FORM_GUIDES[s.key];
  if (!guide) continue;
  for (const n of [s.name, ...guide.aliases]) byName.set(norm(n), guide);
}

/** 標準のフォーム解説（種目名・別名で検索） */
export function formGuideFor(name: string): FormGuide | undefined {
  return byName.get(norm(name));
}

export const hasGuideContent = (g?: ExerciseGuide) =>
  !!g && [g.setup, g.movement, g.tips, g.caution, ...g.mistakes].some((s) => s.trim());

/** メイン扱いにする寄与率の下限 */
export const MAIN_RATE = 0.8;

export const musclesLabel = (muscles: Partial<Record<Muscle, number>>, main: boolean) =>
  (Object.entries(muscles) as [Muscle, number][])
    .filter(([, r]) => r > 0 && (main ? r >= MAIN_RATE : r < MAIN_RATE))
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => MUSCLES[m])
    .join("・");

export interface GuideTarget {
  name: string;
  bodyPart: BodyPart;
  muscles?: Partial<Record<Muscle, number>>;
  guide?: ExerciseGuide;
}

interface ResolvedGuide extends Omit<FormGuide, "aliases" | "reps" | "sets" | "level"> {
  reps?: string;
  sets?: number;
  level?: FormGuide["level"];
  custom: boolean;
}

/** 自分で書いた解説があればそれを、なければ標準の解説を返す */
export function guideFor(ex: GuideTarget): ResolvedGuide | undefined {
  if (hasGuideContent(ex.guide)) {
    const g = ex.guide!;
    const muscles = ex.muscles && Object.keys(ex.muscles).length > 0 ? ex.muscles : MUSCLE_MAP[ex.bodyPart];
    return {
      custom: true,
      primary: musclesLabel(muscles, true),
      secondary: musclesLabel(muscles, false),
      setup: g.setup,
      movement: g.movement,
      tips: g.tips,
      mistakes: g.mistakes.filter((m) => m.trim()),
      caution: g.caution,
    };
  }
  const std = formGuideFor(ex.name);
  return std && { ...std, custom: false };
}

export function FormGuideSheet({ exercise, onClose }: { exercise: GuideTarget | null; onClose: () => void }) {
  const guide = exercise ? guideFor(exercise) : undefined;
  return (
    <Sheet open={!!guide} onClose={onClose} title={exercise ? `${exercise.name} のフォーム` : undefined}>
      {guide && (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-1">
            {guide.level && <Badge color={guide.level === "初級" ? "ok" : "warn"}>{guide.level}</Badge>}
            {guide.reps && (
              <Badge>
                目安 {guide.reps} × {guide.sets}セット
              </Badge>
            )}
            {guide.custom && <Badge color="accent">自分で作成</Badge>}
          </div>
          {(guide.primary || guide.secondary) && (
            <div className="rounded-xl bg-card2 p-3 text-xs leading-relaxed">
              {guide.primary && (
                <div>
                  <span className="font-bold text-accent">主に効く</span>　{guide.primary}
                </div>
              )}
              {guide.secondary && (
                <div className="mt-0.5 text-muted">
                  <span className="font-bold">補助</span>　{guide.secondary}
                </div>
              )}
            </div>
          )}
          {guide.setup && <GuideItem label="開始姿勢" text={guide.setup} />}
          {guide.movement && <GuideItem label="動作" text={guide.movement} />}
          {guide.tips && <GuideItem label="フォームのポイント" text={guide.tips} accent />}
          {guide.mistakes.length > 0 && (
            <section>
              <h4 className="text-xs font-bold text-muted">よくあるミス</h4>
              <ul className="mt-1 space-y-0.5">
                {guide.mistakes.map((m) => (
                  <li key={m} className="flex gap-1.5 leading-relaxed">
                    <span className="text-red-400">✕</span>
                    {m}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {guide.caution && (
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-xs leading-relaxed text-yellow-100">
              ⚠️ {guide.caution}
            </div>
          )}
          <details className="rounded-xl bg-card2 p-3 text-xs">
            <summary className="font-bold text-muted">全種目共通のポイント</summary>
            <dl className="mt-2 space-y-1.5 leading-relaxed">
              {FORM_BASICS.map((b) => (
                <div key={b.label}>
                  <dt className="font-bold">{b.label}</dt>
                  <dd className="text-white/70">{b.text}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      )}
    </Sheet>
  );
}

function GuideItem({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <section>
      <h4 className={accent ? "text-xs font-bold text-accent" : "text-xs font-bold text-muted"}>{label}</h4>
      <p className="mt-0.5 whitespace-pre-line leading-relaxed">{text}</p>
    </section>
  );
}
