"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartIcon, HomeIcon, TimerIcon, UserIcon } from "./Icons";
import { cx } from "./ui";
import { useTimer } from "@/lib/timerStore";

const TABS = [
  { href: "/", label: "ホーム", Icon: HomeIcon, match: ["/", "/calendar", "/workout", "/meals"] },
  { href: "/timer", label: "タイマー", Icon: TimerIcon, match: ["/timer"] },
  { href: "/analysis", label: "分析", Icon: ChartIcon, match: ["/analysis"] },
  { href: "/profile", label: "プロフィール", Icon: UserIcon, match: ["/profile", "/settings", "/menu"] },
];

export function TabBar() {
  const pathname = usePathname();
  const timerStatus = useTimer((s) => s.status);
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-line/70 bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="grid h-16 grid-cols-4">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
          return (
            <li key={href}>
              <Link
                href={href}
                className={cx(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-bold transition",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon size={22} />
                {label}
                {href === "/timer" && (timerStatus === "running" || timerStatus === "finished") && (
                  <span
                    className={cx(
                      "absolute top-2.5 right-[calc(50%-18px)] h-2 w-2 rounded-full",
                      timerStatus === "finished" ? "bg-red-500" : "bg-ok animate-pulse",
                    )}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
