export class CategoryTransactionCsvIngestResponseDto {
  importRunId!: string;
  firstTimeUser!: boolean;
  receivedCount!: number;
  insertedCount!: number;
  duplicatedCount!: number;
  classifiedCount!: number;
  unclassifiedCount!: number;
  suggestionsCreated!: number;
}
