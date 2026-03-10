import { BadRequestException } from '@nestjs/common';

export function assertMonthYm(monthYm: string): void {
  const ok = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthYm);
  if (!ok) throw new BadRequestException('monthYm must be YYYY-MM');
}

export function monthRangeUtc(monthYm: string): { start: Date; end: Date } {
  assertMonthYm(monthYm);
  const [year, month] = monthYm.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end };
}
