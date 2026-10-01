"use client";

import type { ReactElement, SVGProps } from "react";
import type { Muscle } from "@/lib/types";
import { fatigueColor, type MuscleFatigue } from "@/lib/calc";

type Shape = { muscle: Muscle; el: (p: SVGProps<SVGElement>) => ReactElement };

const NEUTRAL = "#262632";

const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0) =>
  function E(p: SVGProps<SVGElement>) {
    return (
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}
        {...(p as SVGProps<SVGEllipseElement>)}
      />
    );
  };

const path = (d: string) =>
  function P(p: SVGProps<SVGElement>) {
    return <path d={d} {...(p as SVGProps<SVGPathElement>)} />;
  };

const rect = (x: number, y: number, w: number, h: number, r: number) =>
  function R(p: SVGProps<SVGElement>) {
    return <rect x={x} y={y} width={w} height={h} rx={r} {...(p as SVGProps<SVGRectElement>)} />;
  };

const FRONT: Shape[] = [
  { muscle: "shoulder", el: ell(31, 40, 7, 6.5) },
  { muscle: "shoulder", el: ell(69, 40, 7, 6.5) },
  { muscle: "chest", el: path("M49 35 L37 36 Q32 44 35 52 Q42 56 49 53 Z") },
  { muscle: "chest", el: path("M51 35 L63 36 Q68 44 65 52 Q58 56 51 53 Z") },
  { muscle: "biceps", el: ell(27, 57, 4.8, 10, 10) },
  { muscle: "biceps", el: ell(73, 57, 4.8, 10, -10) },
  { muscle: "forearm", el: ell(22.5, 80, 4.2, 11, 12) },
  { muscle: "forearm", el: ell(77.5, 80, 4.2, 11, -12) },
  { muscle: "abs", el: rect(42, 56, 16, 36, 5) },
  { muscle: "quads", el: ell(43, 124, 7.5, 19) },
  { muscle: "quads", el: ell(57, 124, 7.5, 19) },
  { muscle: "calves", el: ell(43, 166, 5, 14) },
  { muscle: "calves", el: ell(57, 166, 5, 14) },
];

const BACK: Shape[] = [
  { muscle: "back", el: path("M44 25 L56 25 L66 36 L50 45 L34 36 Z") },
  { muscle: "shoulder", el: ell(31, 40, 7, 6.5) },
  { muscle: "shoulder", el: ell(69, 40, 7, 6.5) },
  { muscle: "back", el: path("M36 45 Q34 60 42 76 L49 72 L49 47 Z") },
  { muscle: "back", el: path("M64 45 Q66 60 58 76 L51 72 L51 47 Z") },
  { muscle: "back", el: rect(43, 76, 14, 16, 4) },
  { muscle: "triceps", el: ell(27, 57, 4.8, 10, 10) },
  { muscle: "triceps", el: ell(73, 57, 4.8, 10, -10) },
  { muscle: "forearm", el: ell(22.5, 80, 4.2, 11, 12) },
  { muscle: "forearm", el: ell(77.5, 80, 4.2, 11, -12) },
  { muscle: "glutes", el: ell(44, 102, 7, 8) },
  { muscle: "glutes", el: ell(56, 102, 7, 8) },
  { muscle: "hamstrings", el: ell(43, 127, 6.5, 16) },
  { muscle: "hamstrings", el: ell(57, 127, 6.5, 16) },
  { muscle: "calves", el: ell(43, 164, 5.5, 13) },
  { muscle: "calves", el: ell(57, 164, 5.5, 13) },
];

function Silhouette() {
  return (
    <g fill={NEUTRAL}>
      <circle cx="50" cy="14" r="9" />
      <rect x="46" y="22" width="8" height="8" rx="2" />
      <path d="M30 34 Q50 29 70 34 L68 60 Q66 80 63 94 L37 94 Q34 80 32 60 Z" />
      <path d="M38 92 L62 92 L64 108 L36 108 Z" />
      <circle cx="19" cy="94" r="3.6" />
      <circle cx="81" cy="94" r="3.6" />
      <circle cx="43" cy="146" r="4.2" />
      <circle cx="57" cy="146" r="4.2" />
      <ellipse cx="43" cy="185" rx="5" ry="3" />
      <ellipse cx="57" cy="185" rx="5" ry="3" />
    </g>
  );
}

function Figure({
  shapes,
  fatigue,
  selected,
  onSelect,
  label,
  front,
}: {
  shapes: Shape[];
  fatigue: Record<Muscle, MuscleFatigue>;
  selected: Muscle | null;
  onSelect: (m: Muscle) => void;
  label: string;
  front?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="8 0 84 192" className="h-64 w-full">
        <Silhouette />
        {shapes.map((s, i) => {
          const El = s.el;
          const isSel = selected === s.muscle;
          return (
            <El
              key={i}
              fill={fatigueColor(fatigue[s.muscle].score)}
              stroke={isSel ? "#ffffff" : "#0b0b0f"}
              strokeWidth={isSel ? 1.4 : 0.8}
              style={{ cursor: "pointer", transition: "fill 0.3s" }}
              onClick={() => onSelect(s.muscle)}
            />
          );
        })}
        {front && (
          <g stroke="#0b0b0f" strokeWidth="0.6" opacity="0.6" pointerEvents="none">
            <line x1="50" y1="57" x2="50" y2="91" />
            <line x1="42.5" y1="68" x2="57.5" y2="68" />
            <line x1="42.5" y1="79" x2="57.5" y2="79" />
          </g>
        )}
      </svg>
      <span className="mt-1 text-xs font-bold text-muted">{label}</span>
    </div>
  );
}

export function BodyMap({
  fatigue,
  selected,
  onSelect,
}: {
  fatigue: Record<Muscle, MuscleFatigue>;
  selected: Muscle | null;
  onSelect: (m: Muscle) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Figure shapes={FRONT} fatigue={fatigue} selected={selected} onSelect={onSelect} label="前面" front />
        <Figure shapes={BACK} fatigue={fatigue} selected={selected} onSelect={onSelect} label="背面" />
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted">
        <span>0</span>
        <div
          className="h-2 flex-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${fatigueColor(0)}, ${fatigueColor(1)}, ${fatigueColor(50)}, ${fatigueColor(100)})`,
          }}
        />
        <span>100</span>
      </div>
    </div>
  );
}
