"use client";

import { SAMPLE_EXERCISES } from "@/lib/constants";
import { FORM_BASICS, FORM_GUIDES, type FormGuide } from "@/lib/formGuides";
import { Badge, Sheet } from "@/components/ui";

const norm = (s: string) => s.replace(/\s|　/g, "");

const byName = new Map<string, FormGuide>();
for (const s of SAMPLE_EXERCISES) {
  const guide = FORM_GUIDES[s.key];
  if (!guide) continue;
  for (const n of [s.name, ...guide.aliases]) byName.set(norm(n), guide);
}

export function formGuideFor(name: string): FormGuide | undefined {
  return byName.get(norm(name));
}

export function FormGuideSheet({ name, onClose }: { name: string | null; onClose: () => void }) {
  const guide = name ? formGuideFor(name) : undefined;
  return (
    <Sheet open={!!guide} onClose={onClose} title={name ? `${name} のフォーム` : undefined}>
      {guide && (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-1">
            <Badge color={guide.level === "初級" ? "ok" : "warn"}>{guide.level}</Badge>
            <Badge>目安 {guide.reps} × {guide.sets}セット</Badge>
          </div>
          <div className="rounded-xl bg-card2 p-3 text-xs leading-relaxed">
            <div>
              <span className="font-bold text-accent">主に効く</span>　{guide.primary}
            </div>
            <div className="mt-0.5 text-muted">
              <span className="font-bold">補助</span>　{guide.secondary}
            </div>
          </div>
          <GuideItem label="開始姿勢" text={guide.setup} />
          <GuideItem label="動作" text={guide.movement} />
          <GuideItem label="フォームのポイント" text={guide.tips} accent />
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
          <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-xs leading-relaxed text-yellow-100">
            ⚠️ {guide.caution}
          </div>
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
      <p className="mt-0.5 leading-relaxed">{text}</p>
    </section>
  );
}
