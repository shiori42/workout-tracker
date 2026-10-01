"use client";

import { create } from "zustand";

export interface Toast {
  id: number;
  title: string;
  body?: string;
  icon?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">, ttl?: number) => void;
  remove: (id: number) => void;
}

let seq = 0;

export const useToast = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t, ttl = 4000) => {
    const id = ++seq;
    set({ toasts: [...get().toasts, { ...t, id }] });
    setTimeout(() => get().remove(id), ttl);
  },
  remove: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

export const toast = (title: string, body?: string, icon?: string) =>
  useToast.getState().push({ title, body, icon });
