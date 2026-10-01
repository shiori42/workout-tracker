"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BackIcon, XIcon } from "./Icons";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function PageHeader({
  title,
  back,
  right,
}: {
  title: string;
  back?: string | true;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line/60 bg-bg/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="w-10">
        {back && (
          <button
            aria-label="戻る"
            className="grid h-10 w-10 place-items-center rounded-full text-muted active:bg-card2"
            onClick={() => (back === true ? router.back() : router.push(back))}
          >
            <BackIcon />
          </button>
        )}
      </div>
      <h1 className="flex-1 text-center text-base font-bold">{title}</h1>
      <div className="flex w-10 justify-end">{right}</div>
    </header>
  );
}

export function Card({
  children,
  className,
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={cx("rounded-2xl bg-card p-4", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-bold text-white/90">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

const btnClass = (variant: BtnVariant, size: "md" | "sm" | "lg") =>
  cx(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-bold transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100",
    size === "lg" && "h-14 px-6 text-lg",
    size === "md" && "h-11 px-4 text-sm",
    size === "sm" && "h-8 px-3 text-xs",
    variant === "primary" && "bg-accent text-white shadow-[0_6px_20px_-6px] shadow-accent/60",
    variant === "secondary" && "bg-card2 text-white",
    variant === "ghost" && "text-muted active:bg-card2",
    variant === "danger" && "bg-red-500/15 text-red-400",
  );

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "md" | "sm" | "lg";
}) {
  return <button className={cx(btnClass(variant, size), className)} {...p} />;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: BtnVariant;
  size?: "md" | "sm" | "lg";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(btnClass(variant, size), className)}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-card2 px-3 text-white outline-none placeholder:text-muted/60 focus:border-accent";

/** 呼び出し側で幅・高さを指定した場合は既定の h-11 / w-full を外す（CSS の優先順で上書きできないため） */
const inputClassFor = (className?: string) => {
  let base = inputClass;
  if (className && /(^|\s)w-/.test(className)) base = base.replace("w-full ", "");
  if (className && /(^|\s)h-/.test(className)) base = base.replace("h-11 ", "");
  return cx(base, className);
};

export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={inputClassFor(p.className)} />;
}

export function NumberInput({
  value,
  onChange,
  step = 1,
  min = 0,
  className,
  placeholder,
  ...rest
}: {
  value: number | "";
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  className?: string;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      value={text ?? value}
      placeholder={placeholder}
      onFocus={(e) => {
        setText(String(value));
        e.currentTarget.select();
      }}
      onBlur={() => setText(null)}
      onChange={(e) => {
        setText(e.target.value);
        const v = e.target.value === "" ? 0 : Number(e.target.value);
        if (!Number.isNaN(v)) onChange(Math.max(min, v));
      }}
      className={inputClassFor(className)}
      {...rest}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={inputClassFor(cx("appearance-none pr-8", className))}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239a9aab' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TextArea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...p}
      className={cx(
        "w-full rounded-xl border border-line bg-card2 px-3 py-2 text-white outline-none placeholder:text-muted/60 focus:border-accent",
        p.className,
      )}
    />
  );
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cx("flex rounded-xl bg-card2 p-1", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            "h-8 flex-1 rounded-lg text-xs font-bold transition",
            value === o.value ? "bg-accent text-white" : "text-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-7 w-12 shrink-0 rounded-full transition",
        checked ? "bg-accent" : "bg-line",
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

/** 画面下からせり上がるシート（スマホ幅に固定） */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="absolute inset-0 bg-black/60 animate-fade" onClick={onClose} />
      <div className="relative mt-auto flex max-h-[88dvh] w-full max-w-[430px] flex-col rounded-t-3xl bg-card animate-slide-up">
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="w-9" />
          <div className="h-1.5 w-10 rounded-full bg-line" />
          <button
            aria-label="閉じる"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-muted active:bg-card2"
          >
            <XIcon size={20} />
          </button>
        </div>
        {title && <h3 className="px-5 pb-2 text-lg font-bold">{title}</h3>}
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && (
          <div className="border-t border-line/60 px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
        {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  sub,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-xl bg-card2 p-3", className)}>
      <div className="text-[11px] font-bold text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-extrabold tabular-nums">{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function Badge({ children, color = "default" }: { children: ReactNode; color?: "default" | "accent" | "ok" | "warn" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold",
        color === "default" && "bg-card2 text-muted",
        color === "accent" && "bg-accent/15 text-accent",
        color === "ok" && "bg-ok/15 text-ok",
        color === "warn" && "bg-yellow-400/15 text-yellow-300",
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-2 overflow-hidden rounded-full bg-card2", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}

export function ListLink({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-1 py-3 active:bg-card2"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-card2 text-accent">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-bold">{label}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
      <span className="text-muted">›</span>
    </Link>
  );
}
