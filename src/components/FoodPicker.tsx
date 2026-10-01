"use client";

import { useEffect, useRef, useState } from "react";
import { searchBuiltin, type FoodItem } from "@/lib/foods";
import { Button, Input } from "./ui";

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

const getDetector = (): BarcodeDetectorCtor | null =>
  typeof window !== "undefined" && "BarcodeDetector" in window
    ? (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector
    : null;

/** 食品検索（内蔵リスト＋Open Food Facts）とバーコード読み取り */
export function FoodPicker({ onPick, onClose }: { onPick: (f: FoodItem) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<FoodItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");

  const local = searchBuiltin(q, q ? 12 : 8);

  const searchRemote = async (params: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/food?${params}`);
      const json = (await res.json()) as { items: FoodItem[]; error?: string };
      setRemote(json.items);
      if (!res.ok) setError("食品データベースに接続できませんでした");
      else if (json.items.length === 0) setError("見つかりませんでした。手入力してください");
    } catch {
      setError("オフラインのため検索できません");
    } finally {
      setLoading(false);
    }
  };

  const lookupCode = (c: string) => {
    const digits = c.replace(/\D/g, "");
    if (digits.length < 8) return;
    setCode(digits);
    setScanning(false);
    void searchRemote(`code=${digits}`);
  };

  return (
    <div className="rounded-2xl border border-line bg-bg p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-extrabold">食品を検索</div>
        <button type="button" onClick={onClose} className="text-xs font-bold text-muted">
          閉じる
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setRemote(null);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && q.trim().length >= 2 && void searchRemote(`q=${encodeURIComponent(q.trim())}`)}
          placeholder="例：鶏むね、ヨーグルト"
          aria-label="食品名"
        />
        <Button
          size="sm"
          variant="secondary"
          className="h-11 shrink-0"
          disabled={q.trim().length < 2 || loading}
          onClick={() => void searchRemote(`q=${encodeURIComponent(q.trim())}`)}
        >
          商品検索
        </Button>
      </div>

      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setScanning((v) => !v)}>
          📷 バーコード
        </Button>
        <Input
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookupCode(code)}
          placeholder="JANコードを入力"
          aria-label="JANコード"
          className="h-9 text-sm"
        />
        <Button size="sm" variant="secondary" className="shrink-0" disabled={code.replace(/\D/g, "").length < 8 || loading} onClick={() => lookupCode(code)}>
          照会
        </Button>
      </div>

      {scanning && <BarcodeScanner onDetect={lookupCode} onClose={() => setScanning(false)} />}

      <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
        {loading && <p className="py-2 text-center text-xs text-muted">検索中…</p>}
        {error && <p className="py-1 text-center text-xs text-yellow-300">{error}</p>}
        {remote?.map((f, i) => <FoodRow key={`r${i}`} f={f} onPick={onPick} />)}
        {!remote && local.map((f) => <FoodRow key={f.name} f={f} onPick={onPick} />)}
        {!remote && q && local.length === 0 && (
          <p className="py-2 text-center text-xs text-muted">内蔵リストにありません。「商品検索」で市販品を探せます</p>
        )}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        内蔵リストは目安値です。商品検索・バーコードは Open Food Facts（ODbL）のデータを利用しています。
      </p>
    </div>
  );
}

function FoodRow({ f, onPick }: { f: FoodItem; onPick: (f: FoodItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(f)}
      className="flex w-full items-center gap-2 rounded-xl bg-card2 px-3 py-2 text-left active:bg-line"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{f.name}</span>
        <span className="block truncate text-[11px] text-muted">
          {f.brand && `${f.brand} ・ `}
          {f.amount}
          {f.proteinG !== undefined && ` ・ P${f.proteinG} F${f.fatG ?? "-"} C${f.carbG ?? "-"}`}
        </span>
      </span>
      <span className="shrink-0 text-sm font-extrabold tabular-nums">
        {f.kcal}
        <span className="text-[10px] text-muted">kcal</span>
      </span>
    </button>
  );
}

function BarcodeScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const Detector = getDetector();
  const onDetectRef = useRef(onDetect);
  useEffect(() => {
    onDetectRef.current = onDetect;
  });

  useEffect(() => {
    if (!Detector) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const loop = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found[0]?.rawValue) {
              onDetectRef.current(found[0].rawValue);
              return;
            }
          } catch {
            /* フレーム未準備 */
          }
          raf = window.setTimeout(loop, 250);
        };
        void loop();
      } catch {
        setMsg("カメラを起動できませんでした。JANコードを手入力してください");
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [Detector]);

  if (!Detector) {
    return (
      <p className="mt-2 rounded-xl bg-card2 p-3 text-xs text-muted">
        このブラウザはバーコード読み取りに対応していません（Android Chrome などで利用可）。JANコードを手入力してください。
      </p>
    );
  }
  return (
    <div className="relative mt-2 overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
      {msg && <p className="absolute inset-x-0 bottom-0 bg-black/70 p-2 text-xs">{msg}</p>}
      <button type="button" onClick={onClose} className="absolute top-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-bold">
        停止
      </button>
    </div>
  );
}
