import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { NormalizedCsvRow } from '../interfaces/normalized-csv-row.interface';

/**
 * Parses common bank CSV variants into canonical rows.
 */
@Injectable()
export class CsvParserService {
  parseAndNormalize(buffer: Buffer): NormalizedCsvRow[] {
    const text = buffer.toString('utf-8');

    const records = parse(text, {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    if (!records.length) {
      throw new BadRequestException('CSV is empty');
    }

    const first = records[0].map((cell) => cell.toLowerCase());
    const hasHeader =
      first.includes('date') ||
      first.includes('amount') ||
      first.includes('description');

    const rows = hasHeader ? records.slice(1) : records;
    const header = hasHeader ? first : [];

    return rows.map((row) => {
      const dateRaw = hasHeader ? this.byHeader(row, header, 'date') : row[0];
      const amountRaw = hasHeader
        ? this.byHeader(row, header, 'amount')
        : row[1];
      const descriptionRaw = hasHeader
        ? this.byHeader(row, header, 'description')
        : row[2];
      const balanceRaw = hasHeader
        ? this.byHeader(row, header, 'balance', true)
        : row[3];

      if (!dateRaw || !amountRaw || !descriptionRaw) {
        throw new BadRequestException('CSV row missing required fields');
      }

      const description = descriptionRaw.trim();

      return {
        occurredAt: this.parseDate(dateRaw),
        amountSigned: this.parseAmount(amountRaw),
        description,
        merchant: description,
        balance: balanceRaw ? this.parseAmount(balanceRaw) : undefined,
      };
    });
  }

  private byHeader(
    row: string[],
    header: string[],
    key: string,
    optional = false,
  ): string | undefined {
    const idx = header.indexOf(key);
    if (idx < 0) {
      if (optional) return undefined;
      throw new BadRequestException(`CSV header missing '${key}' column`);
    }
    return row[idx];
  }

  private parseDate(input: string): Date {
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

  private parseAmount(input: string): number {
    const normalized = input.replace(/\s/g, '').replace(/,/g, '');
    const amount = Number(normalized);

    if (Number.isNaN(amount)) {
      throw new BadRequestException(`Invalid amount: ${input}`);
    }

    return amount;
  }
}
