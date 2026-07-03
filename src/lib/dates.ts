export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Monday of next week relative to `from`.
export function nextMonday(from = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const delta = ((8 - day) % 7) || 7; // days until next Monday (never 0)
  return addDays(d, delta);
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function longLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// Research window: the trailing seven days ending today. On the Saturday cron
// this is Sunday-to-Saturday; on a midweek manual run it stays fresh instead
// of pointing at an older completed week.
export function lastWeekRange(from = new Date()): { sunday: Date; saturday: Date } {
  const end = new Date(from);
  return { sunday: addDays(end, -7), saturday: end };
}
