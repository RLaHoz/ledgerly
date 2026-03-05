/**
 * API response contract for CSV ingestion.
 */
export class IngestCsvResponseDto {
  importRunId!: string;
  firstTimeUser!: boolean;
  receivedCount!: number;
  insertedCount!: number;
  duplicatedCount!: number;
  classifiedCount!: number;
  unclassifiedCount!: number;
  suggestionsCreated!: number;
}
