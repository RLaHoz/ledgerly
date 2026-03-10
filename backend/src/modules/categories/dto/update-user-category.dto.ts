import {
  IsHexColor,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class UpdateUserCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(SLUG_REGEX)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ionIcon?: string;

  @IsOptional()
  @IsHexColor()
  colorHex?: string;
}
