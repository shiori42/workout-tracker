"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** クライアントでマウント済みか（localStorage 由来の状態を SSR と食い違わせないため） */
export const useMounted = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

/** active な間だけ一定間隔で現在時刻を更新する */
export function useNow(active: boolean, interval = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, interval);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active, interval]);
  return now;
}
