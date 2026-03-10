import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

export interface NormalizedCsvRow {
  occurredAt: Date;
  amountSigned: number;
  description: string;
  merchant: string;
  balance?: number;
}

function parseDate(input: string): Date {
  const value = input.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split('/');
    const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    if (!Number.isNaN(d.getTime())) return d;
  }

  throw new BadRequestException(`Unsupported date format: ${input}`);
}

function parseAmount(input: string): number {
  const normalized = input.replace(/\s/g, '').replace(/,/g, '');
  const n = Number(normalized);
  if (Number.isNaN(n))
    throw new BadRequestException(`Invalid amount: ${input}`);
  return n;
}

export function parseAndNormalizeCsv(buffer: Buffer): NormalizedCsvRow[] {
  const text = buffer.toString('utf-8');

  const records = parse(text, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (!records.length) throw new BadRequestException('CSV is empty');

  const first = records[0].map((c) => c.toLowerCase());
  const hasHeader =
    first.includes('date') ||
    first.includes('amount') ||
    first.includes('description');

  const rows = hasHeader ? records.slice(1) : records;
  const header = hasHeader ? first : [];

  return rows.map((row) => {
    const dateRaw = hasHeader ? row[header.indexOf('date')] : row[0];
    const amountRaw = hasHeader ? row[header.indexOf('amount')] : row[1];
    const descRaw = hasHeader ? row[header.indexOf('description')] : row[2];
    const balRaw = hasHeader
      ? (row[header.indexOf('balance')] ?? undefined)
      : (row[3] ?? undefined);

    if (!dateRaw || !amountRaw || !descRaw) {
      throw new BadRequestException('CSV row missing required fields');
    }

    return {
      occurredAt: parseDate(dateRaw),
      amountSigned: parseAmount(amountRaw),
      description: descRaw.trim(),
      merchant: descRaw.trim(),
      balance: balRaw ? parseAmount(balRaw) : undefined,
    };
  });
}
