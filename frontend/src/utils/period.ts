export type Period = "day" | "week" | "month" | "year";

export const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: "day", label: "Harian" },
  { key: "week", label: "Mingguan" },
  { key: "month", label: "Bulanan" },
  { key: "year", label: "Tahunan" },
];

// Start of the current period (local time).
export function periodStart(p: Period): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === "day") return d;
  if (p === "week") {
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    return d;
  }
  if (p === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

export function inPeriod(iso: string | undefined, p: Period): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  return t >= periodStart(p).getTime();
}

export function periodLabel(p: Period): string {
  const now = new Date();
  if (p === "day") return now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (p === "week") return "Minggu ini (sejak " + periodStart("week").toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + ")";
  if (p === "month") return now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  return "Tahun " + now.getFullYear();
}
