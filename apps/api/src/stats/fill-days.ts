export type DayRow = { day: string; clicks: number };

const WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

function utcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// First instant (UTC midnight) of the 30-day window that ends on today's UTC date.
export function windowStart(today: Date): Date {
  return new Date(utcMidnight(today) - (WINDOW_DAYS - 1) * DAY_MS);
}

// Zero-fills the by-day aggregate into exactly 30 ascending UTC days ending today.
// Rows outside the window are ignored.
export function fillDays(rows: DayRow[], today: Date): DayRow[] {
  const clicksByDay = new Map(rows.map((row) => [row.day, row.clicks]));
  const start = windowStart(today).getTime();
  return Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const day = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
    return { day, clicks: clicksByDay.get(day) ?? 0 };
  });
}
