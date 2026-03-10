import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class RunCurrentMonthSyncDto {
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includePending?: boolean;
}

function toBoolean(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return value;
}
