export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export const pad = (n: number) => String(n).padStart(2, "0");

export const ymd = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (s: string, n: number) => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

export const monthOf = (s: string) => s.slice(0, 7);

export const addMonths = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const daysInMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

export const weekdayOf = (s: string) => parseYmd(s).getDay();

export const fmtDate = (s: string) => {
  const d = parseYmd(s);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
};

export const fmtDateLong = (s: string) => {
  const d = parseYmd(s);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`;
};

export const fmtMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${y}年${m}月`;
};

export const fmtMinutes = (min: number) => {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}分`;
  return `${Math.floor(m / 60)}時間${m % 60}分`;
};

export const fmtClock = (totalSec: number) => {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  return `${m}:${pad(s % 60)}`;
};

export const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours()}:${pad(d.getMinutes())}`;
};

export const fmtDateTime = (ts: number) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${pad(d.getMinutes())}`;
};

export const datesBetween = (from: string, to: string) => {
  const out: string[] = [];
  let d = from;
  let guard = 0;
  while (d <= to && guard < 5000) {
    out.push(d);
    d = addDays(d, 1);
    guard++;
  }
  return out;
};

/** 月曜始まりの週キー（その週の月曜日） */
export const weekKey = (s: string) => {
  const wd = weekdayOf(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
};
