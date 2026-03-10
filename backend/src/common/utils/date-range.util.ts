import { BadRequestException } from '@nestjs/common';

export interface CurrentMonthRangeResult {
  fromUtc: Date;
  toUtc: Date;
  timeZone: string;
}

/**
 * Returns the UTC range for the current month in the user's time zone.
 * Start = first day of month at 00:00:00 local user time.
 * End   = current instant (UTC now).
 */
export function resolveCurrentMonthRangeForUser(
  timeZone: string,
  now = new Date(),
): CurrentMonthRangeResult {
  const resolvedTimeZone = normalizeTimeZone(timeZone);
  const { year, month } = getZonedDateParts(now, resolvedTimeZone);

  const fromUtc = zonedDateTimeToUtc({
    year,
    month,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
    timeZone: resolvedTimeZone,
  });

  if (Number.isNaN(fromUtc.getTime()) || Number.isNaN(now.getTime())) {
    throw new BadRequestException('Unable to resolve current month date range');
  }

  return {
    fromUtc,
    toUtc: now,
    timeZone: resolvedTimeZone,
  };
}

function normalizeTimeZone(timeZone?: string): string {
  const fallback = 'UTC';
  if (!timeZone || !timeZone.trim()) {
    return fallback;
  }

  const trimmed = timeZone.trim();
  try {
    Intl.DateTimeFormat('en-US', { timeZone: trimmed }).format(new Date());
    return trimmed;
  } catch {
    return fallback;
  }
}

function getZonedDateParts(
  date: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    throw new BadRequestException('Unable to parse date parts for time zone');
  }

  return { year, month, day };
}

function zonedDateTimeToUtc(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  timeZone: string;
}): Date {
  const utcGuess = new Date(
    Date.UTC(
      input.year,
      input.month - 1,
      input.day,
      input.hour,
      input.minute,
      input.second,
      input.millisecond,
    ),
  );

  const timeZoneOffset = getTimeZoneOffsetMs(utcGuess, input.timeZone);
  return new Date(utcGuess.getTime() - timeZoneOffset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value);
  const second = Number(parts.find((p) => p.type === 'second')?.value);

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  return asUtc - date.getTime();
}
