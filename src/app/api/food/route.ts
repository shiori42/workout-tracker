import { NextResponse } from "next/server";
import type { FoodItem } from "@/lib/foods";
import { requireUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const OFF = process.env.OPEN_FOOD_FACTS_URL || "https://world.openfoodfacts.org";
const UA = "KintoreKanriApp/1.2 (personal fitness PWA)";
const FIELDS = "code,product_name,product_name_ja,brands,nutriments,serving_size,quantity";

const OFF_SEARCH = process.env.OPEN_FOOD_FACTS_SEARCH_URL || "https://search.openfoodfacts.org";

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_ja?: string;
  brands?: string | string[];
  serving_size?: string;
  quantity?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const num = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : undefined;
};

function toItems(p: OffProduct): FoodItem[] {
  const name = (p.product_name_ja || p.product_name || "").trim();
  const n = p.nutriments ?? {};
  if (!name) return [];
  const brand = (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(",")[0])?.trim() || undefined;
  const kcal100 = num(n["energy-kcal_100g"]) ?? (num(n["energy_100g"]) !== undefined ? num(Number(n["energy_100g"]) / 4.184) : undefined);
  const out: FoodItem[] = [];
  const kcalServing = num(n["energy-kcal_serving"]);
  if (kcalServing !== undefined && p.serving_size) {
    out.push({
      name,
      brand,
      amount: `1食 ${p.serving_size}`,
      kcal: Math.round(kcalServing),
      proteinG: num(n["proteins_serving"]),
      fatG: num(n["fat_serving"]),
      carbG: num(n["carbohydrates_serving"]),
      source: "off",
      code: p.code,
    });
  }
  if (kcal100 !== undefined) {
    out.push({
      name,
      brand,
      amount: "100g",
      kcal: Math.round(kcal100),
      proteinG: num(n["proteins_100g"]),
      fatG: num(n["fat_100g"]),
      carbG: num(n["carbohydrates_100g"]),
      source: "off",
      code: p.code,
    });
  }
  return out;
}

async function offFetch(url: string, allow404 = false) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 86400 },
  });
  if (allow404 && res.status === 404) return null;
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  return res.json();
}

async function searchProducts(q: string): Promise<OffProduct[]> {
  try {
    const json = (await offFetch(`${OFF_SEARCH}/search?q=${encodeURIComponent(q)}&page_size=15&fields=${FIELDS}`)) as { hits?: OffProduct[] };
    if (json.hits?.length) return json.hits;
  } catch (e) {
    console.warn("[food] search API failed, falling back", (e as Error).message);
  }
  const json = (await offFetch(
    `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=${FIELDS}`,
  )) as { products?: OffProduct[] };
  return json.products ?? [];
}

export async function GET(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").replace(/\D/g, "");
  const q = (searchParams.get("q") || "").trim().slice(0, 60);
  try {
    if (code) {
      if (code.length < 8 || code.length > 14) return NextResponse.json({ items: [], error: "invalid_code" }, { status: 400 });
      const json = (await offFetch(`${OFF}/api/v2/product/${code}.json?fields=${FIELDS}`, true)) as { status?: number; product?: OffProduct } | null;
      if (!json?.product || json.status === 0) return NextResponse.json({ items: [] });
      return NextResponse.json({ items: toItems({ ...json.product, code }) });
    }
    if (q.length < 2) return NextResponse.json({ items: [] });
    const items = (await searchProducts(q)).flatMap(toItems).slice(0, 20);
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[food] lookup failed", e);
    return NextResponse.json({ items: [], error: "lookup_failed" }, { status: 502 });
  }
}
