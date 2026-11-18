/**
 * US equity market hours (9:30–16:00 America/New_York, Mon–Fri).
 * Display only: contracts enforce feed health themselves.
 * TODO(api): take market status from /health or the quote response instead.
 */
const HOLIDAYS_2026 = new Set(["2026-11-26", "2026-12-25"]);
const HALF_DAYS_2026 = new Set(["2026-11-27", "2026-12-24"]);

export function usMarketStatus(now: Date = new Date()): { open: boolean; label: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  const weekend = get("weekday") === "Sat" || get("weekday") === "Sun";
  const close = HALF_DAYS_2026.has(day) ? 13 * 60 : 16 * 60;
  const open = !weekend && !HOLIDAYS_2026.has(day) && minutes >= 9 * 60 + 30 && minutes < close;
  return { open, label: open ? "US market open" : "US market closed" };
}
