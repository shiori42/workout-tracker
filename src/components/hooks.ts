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

const isTextField = (el: Element | null) =>
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement ||
  (el instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "range", "file"].includes(el.type));

/**
 * 入力欄にフォーカスがある（スマホではキーボード表示中）か。
 * iOS はキーボード表示中に画面全体をずらすため、固定表示の要素が一緒に動いてしまう。
 * 閉じた後もずれが残ることがあるので、フォーカスが外れたら元の位置に戻す。
 */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sync = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const focused = isTextField(document.activeElement);
        setOpen(focused);
        if (!focused) window.scrollTo(0, 0);
      }, 60);
    };
    const vv = window.visualViewport;
    const onViewport = () => {
      if (vv && vv.height >= window.innerHeight - 1 && window.scrollY !== 0) window.scrollTo(0, 0);
    };
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sync);
    vv?.addEventListener("resize", onViewport);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", sync);
      vv?.removeEventListener("resize", onViewport);
    };
  }, []);
  return open;
}

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
