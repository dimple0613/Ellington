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

const STATUS_KEY: Record<string, UnitStatus> = {
  available: "Available",
  held: "Held",
  reserved: "Reserved",
  booked: "Booked",
  sold: "Sold",
  blocked: "Blocked",
  overdue: "Overdue",
};

export function stKey(s: string): UnitStatus {
  return STATUS_KEY[String(s || "").toLowerCase()] || "Available";
}