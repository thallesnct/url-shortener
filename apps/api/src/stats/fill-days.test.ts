import { describe, expect, it } from 'vitest';
import { fillDays, windowStart } from './fill-days.ts';

const today = new Date('2026-09-14T12:00:00Z');

describe('fillDays', () => {
  it('returns 30 ascending UTC days ending today, zero-filled', () => {
    const days = fillDays([], today);
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ day: '2026-08-16', clicks: 0 });
    expect(days[29]).toEqual({ day: '2026-09-14', clicks: 0 });
    expect(days.every((d) => d.clicks === 0)).toBe(true);
    expect([...days].sort((a, b) => a.day.localeCompare(b.day))).toEqual(days);
  });

  it('places counts on their day and ignores rows outside the window', () => {
    const days = fillDays(
      [
        { day: '2026-09-14', clicks: 3 },
        { day: '2026-08-16', clicks: 1 },
        { day: '2026-08-15', clicks: 7 },
      ],
      today,
    );
    expect(days[0]).toEqual({ day: '2026-08-16', clicks: 1 });
    expect(days[29]).toEqual({ day: '2026-09-14', clicks: 3 });
    expect(days.reduce((sum, d) => sum + d.clicks, 0)).toBe(4);
  });

  it('uses the UTC date of "today", not the local one', () => {
    const days = fillDays([], new Date('2026-09-14T23:59:59Z'));
    expect(days[29]?.day).toBe('2026-09-14');
  });

  it('windowStart is UTC midnight 29 days before today', () => {
    expect(windowStart(today).toISOString()).toBe('2026-08-16T00:00:00.000Z');
  });
});
