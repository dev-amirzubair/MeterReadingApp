import { nextReminderTimestamp } from './notificationsService';

describe('nextReminderTimestamp', () => {
  it('returns this month when the target time is still in the future', () => {
    const now = new Date(2025, 5, 10, 8, 0, 0); // 10 Jun 2025, 08:00
    const ts = nextReminderTimestamp({ day: 25, hour: 9 }, 0, now);
    expect(new Date(ts)).toEqual(new Date(2025, 5, 25, 9, 0, 0));
  });

  it('rolls forward to next month when this month has already passed', () => {
    const now = new Date(2025, 5, 26, 12, 0, 0); // 26 Jun 2025, 12:00
    const ts = nextReminderTimestamp({ day: 25, hour: 9 }, 0, now);
    expect(new Date(ts)).toEqual(new Date(2025, 6, 25, 9, 0, 0));
  });

  it('rolls forward when the day is today but the hour has passed', () => {
    const now = new Date(2025, 5, 25, 10, 0, 0); // 25 Jun 2025, 10:00
    const ts = nextReminderTimestamp({ day: 25, hour: 9 }, 0, now);
    expect(new Date(ts)).toEqual(new Date(2025, 6, 25, 9, 0, 0));
  });

  it('schedules the Nth month ahead', () => {
    const now = new Date(2025, 0, 1, 0, 0, 0); // 1 Jan 2025
    const m0 = nextReminderTimestamp({ day: 15, hour: 9 }, 0, now);
    const m6 = nextReminderTimestamp({ day: 15, hour: 9 }, 6, now);
    expect(new Date(m0).getMonth()).toBe(0); // January
    expect(new Date(m6).getMonth()).toBe(6); // July
    expect(new Date(m6).getDate()).toBe(15);
  });

  it('clamps day=31 to the last day of a short month (e.g. February)', () => {
    const now = new Date(2025, 0, 1, 0, 0, 0); // Jan 2025 — non-leap year
    const ts = nextReminderTimestamp({ day: 31, hour: 9 }, 1, now); // Feb
    const date = new Date(ts);
    expect(date.getMonth()).toBe(1); // February
    expect(date.getDate()).toBe(28); // 2025 is not a leap year
  });

  it('honours leap years (Feb 29 when day=29 in a leap year)', () => {
    const now = new Date(2024, 0, 1, 0, 0, 0); // Jan 2024 — leap year
    const ts = nextReminderTimestamp({ day: 29, hour: 9 }, 1, now); // Feb 2024
    const date = new Date(ts);
    expect(date.getDate()).toBe(29);
  });

  it('crosses the year boundary cleanly', () => {
    const now = new Date(2025, 11, 30, 12, 0, 0); // 30 Dec 2025, 12:00
    const ts = nextReminderTimestamp({ day: 5, hour: 9 }, 0, now);
    expect(new Date(ts).getFullYear()).toBe(2026);
    expect(new Date(ts).getMonth()).toBe(0); // January
    expect(new Date(ts).getDate()).toBe(5);
  });

  it('keeps the requested hour exactly', () => {
    const now = new Date(2025, 5, 1, 0, 0, 0);
    const ts = nextReminderTimestamp({ day: 15, hour: 21 }, 0, now);
    expect(new Date(ts).getHours()).toBe(21);
    expect(new Date(ts).getMinutes()).toBe(0);
    expect(new Date(ts).getSeconds()).toBe(0);
  });
});
