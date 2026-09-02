export const AC = "#4F46F5";

export const money = (n: number) =>
  "AED " + Math.round(n).toLocaleString("en-US");

export const compact = (n: number) =>
  n >= 1000
    ? "AED " + (n / 1000).toFixed(2) + "B"
    : "AED " + n.toFixed(1) + "M";

export const stableIdx = (seed: number, i: number) =>
  (seed * 31 + (i + 1) * 17 + 7) % 100;
