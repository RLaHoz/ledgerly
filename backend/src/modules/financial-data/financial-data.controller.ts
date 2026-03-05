import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { IngestCsvResponseDto } from './dto/ingest-csv-response.dto';
import { FinancialDataService } from './services/financial-data.service';

/**
 * HTTP layer only.
 */
@Controller('financial-data/transactions')
export class FinancialDataController {
  constructor(private readonly financialDataService: FinancialDataService) {}

  @Post('csv')
  @UseInterceptors(FileInterceptor('file'))
  async ingestCsv(
    @CurrentUserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<IngestCsvResponseDto> {
    if (!file?.buffer) {
      throw new BadRequestException('CSV file is required');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.financialDataService.ingestCsv(userId, file.buffer);
  }
}
