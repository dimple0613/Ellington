export const AC = "#3B6EF6";

const trim0 = (s: string) => s.replace(/\.0+$/, "").replace(/\.(\d)0$/, ".$1");

export const money = (n: number) =>
  "AED " + Math.round(n).toLocaleString("en-US");

export const compact = (n: number) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 1e9) return "AED " + trim0((v / 1e9).toFixed(1)) + "B";
  if (abs >= 1e6) return "AED " + trim0((v / 1e6).toFixed(1)) + "M";
  if (abs >= 1e3) return "AED " + trim0((v / 1e3).toFixed(1)) + "K";
  return money(v);
};

export const stableIdx = (seed: number, i: number) =>
  (seed * 31 + (i + 1) * 17 + 7) % 100;

export const MONTHS_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtShortDate(v: unknown): string {
  if (!v) return "";
  const d = new Date(v as string | number | Date);
  if (isNaN(d.getTime())) return "";
  return String(d.getDate()).padStart(2, "0") + " " + MONTHS_ABBR[d.getMonth()] + " " + String(d.getFullYear()).slice(-2);
}

export function ramp(t: number): string {
  const A = [240, 239, 254];
  const B = [130, 124, 206];
  const c = Math.max(0, Math.min(1, t));
  return (
    "rgb(" +
    A.map((v, i) => Math.round(v + (B[i] - v) * c)).join(",") +
    ")"
  );
}
