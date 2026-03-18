import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { NormalizedCsvRow } from '../interfaces/normalized-csv-row.interface';

/**
 * Parses bank CSV variants into normalized transaction rows.
 */
@Injectable()
export class CategoryCsvParserService {
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

    const firstRow = records[0].map((cell) => cell.toLowerCase());
    const hasHeader =
      firstRow.includes('date') ||
      firstRow.includes('amount') ||
      firstRow.includes('description');

    const dataRows = hasHeader ? records.slice(1) : records;
    const headerRow = hasHeader ? firstRow : [];

    return dataRows.map((row) => {
      const dateRaw = hasHeader
        ? this.readByHeader(row, headerRow, 'date')
        : row[0];
      const amountRaw = hasHeader
        ? this.readByHeader(row, headerRow, 'amount')
        : row[1];
      const descriptionRaw = hasHeader
        ? this.readByHeader(row, headerRow, 'description')
        : row[2];
      const balanceRaw = hasHeader
        ? this.readByHeader(row, headerRow, 'balance', true)
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

  private readByHeader(
    row: string[],
    header: string[],
    key: string,
    optional = false,
  ): string | undefined {
    const index = header.indexOf(key);
    if (index < 0) {
      if (optional) return undefined;
      throw new BadRequestException(`CSV header missing '${key}' column`);
    }

    return row[index];
  }

  private parseDate(rawInput: string): Date {
    const value = rawInput.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsedDate = new Date(`${value}T00:00:00.000Z`);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/');
      const parsedDate = new Date(
        Date.UTC(Number(year), Number(month) - 1, Number(day)),
      );
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    throw new BadRequestException(`Unsupported date format: ${rawInput}`);
  }

  private parseAmount(rawInput: string): number {
    const normalized = rawInput.replace(/\s/g, '').replace(/,/g, '');
    const parsedAmount = Number(normalized);

    if (Number.isNaN(parsedAmount)) {
      throw new BadRequestException(`Invalid amount: ${rawInput}`);
    }

    return parsedAmount;
  }
}
