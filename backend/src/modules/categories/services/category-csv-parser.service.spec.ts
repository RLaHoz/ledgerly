import { CategoryCsvParserService } from './category-csv-parser.service';

describe('CategoryCsvParserService', () => {
  it('parses a csv with header', () => {
    const parser = new CategoryCsvParserService();
    const csv = Buffer.from(
      'date,amount,description,balance\n2026-03-01,-10.50,Coffee,100.00\n',
    );

    const rows = parser.parseAndNormalize(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.amountSigned).toBe(-10.5);
    expect(rows[0]?.description).toBe('Coffee');
  });
});
