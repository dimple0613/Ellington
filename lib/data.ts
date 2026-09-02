import { AC } from "./format";

export type UnitStatus =
  | "Available"
  | "Held"
  | "Reserved"
  | "Booked"
  | "Sold"
  | "Blocked"
  | "Overdue";

export const ST: Record<UnitStatus, [string, string]> = {
  Available: ["#34C08A", "#E9F8F1"],
  Held: ["#E2A33C", "#FDF4E5"],
  Reserved: ["#8B7CF6", "#F1EEFE"],
  Booked: ["#4F46F5", "#EDECFE"],
  Sold: ["#8A94A6", "#F1F2F6"],
  Blocked: ["#5D6B80", "#EDEFF3"],
  Overdue: ["#E5484D", "#FDECEC"],
};

export const POS = [
  { t: "2BR-Corner", beds: 2, area: 1248, view: "Marina", base: 1560 },
  { t: "1BR-A", beds: 1, area: 748, view: "Community", base: 1450 },
  { t: "1BR-A", beds: 1, area: 748, view: "Community", base: 1455 },
  { t: "2BR-B", beds: 2, area: 1180, view: "Boulevard", base: 1495 },
  { t: "3BR-A", beds: 3, area: 1685, view: "Marina", base: 1610 },
  { t: "1BR-B", beds: 1, area: 712, view: "Pool", base: 1435 },
];

export const BUYERS = [
  "Rajesh Menon",
  "Aisha Al Marri",
  "Daniel Whitfield",
  "Nadia Khoury",
  "Sunil Rathore",
  "Elena Petrova",
  "Omar Al Suwaidi",
  "Grace Okonkwo",
  "Marcus Lindqvist",
  "Fatima Al Hashimi",
  "Wei Chen",
  "Priya Nair",
];

export type Project = {
  code: string;
  name: string;
  loc: string;
  units: number;
  sold: number;
  gdv: number;
  soldV: number;
  coll: number;
  cons: number;
  status: string;
  flag: boolean;
};

export const PROJECTS: Project[] = [
  { code: "BLG", name: "Belgravia Heights III", loc: "Jumeirah Village Circle", units: 248, sold: 176, gdv: 512, soldV: 363.5, coll: 62, cons: 46, status: "Under construction", flag: true },
  { code: "OCH", name: "Ocean House", loc: "Palm Jumeirah", units: 86, sold: 81, gdv: 640, soldV: 601.6, coll: 71, cons: 78, status: "Under construction", flag: false },
  { code: "SMW", name: "Somerset Mews", loc: "Dubai Hills Estate", units: 64, sold: 24, gdv: 288, soldV: 109.4, coll: 38, cons: 12, status: "Enabling works", flag: false },
  { code: "BKP", name: "Berkeley Place", loc: "Mohammed Bin Rashid City", units: 312, sold: 69, gdv: 322, soldV: 70.8, coll: 24, cons: 4, status: "Launched", flag: false },
  { code: "WPK", name: "Wilton Park Residences", loc: "Mohammed Bin Rashid City", units: 140, sold: 140, gdv: 178, soldV: 178.0, coll: 97, cons: 100, status: "In handover", flag: true },
];

export type Unit = {
  f: number;
  pos: number;
  no: string;
  id: string;
  typ: string;
  beds: number;
  area: number;
  view: string;
  psf: number;
  price: number;
  status: UnitStatus;
  base: number;
  buyer: string;
};

export function buildUnits(): Unit[] {
  const out: Unit[] = [];
  const floors: number[] = [];
  for (let f = 45; f >= 15; f--) floors.push(f);
  for (let f = 12; f >= 1; f--) floors.push(f);
  floors.forEach((f) => {
    POS.forEach((p, i) => {
      const r = (f * 31 + (i + 1) * 17 + 7) % 100;
      let st: UnitStatus = "Available";
      if (r < 60) st = "Sold";
      else if (r < 68) st = "Booked";
      else if (r < 73) st = "Reserved";
      else if (r < 75) st = "Held";
      else if (r < 77) st = "Blocked";
      const psf = p.base + f * 13;
      const price = Math.round((p.area * psf) / 5000) * 5000;
      const no = String(f) + String(i + 1).padStart(2, "0");
      out.push({
        f,
        pos: i + 1,
        no,
        id: "H21-T1-" + no,
        typ: p.t,
        beds: p.beds,
        area: p.area,
        view: p.view,
        psf,
        price,
        status: st,
        base: p.base,
        buyer: st === "Sold" || st === "Booked" ? BUYERS[(f + i) % BUYERS.length] : "—",
      });
    });
  });
  return out;
}

export const UNITS = buildUnits();
export const ALL_UNITS = UNITS;

export function selectedUnit(id: string | null): Unit {
  return (
    ALL_UNITS.find((u) => u.id === id) ||
    ALL_UNITS.find((u) => u.no === "1204") ||
    ALL_UNITS[0]
  );
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
