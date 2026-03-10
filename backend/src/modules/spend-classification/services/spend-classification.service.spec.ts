import { Test, TestingModule } from '@nestjs/testing';
import { SpendClassificationService } from './spend-classification.service';

describe('SpendClassificationService', () => {
  let service: SpendClassificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpendClassificationService],
    }).compile();

    service = module.get<SpendClassificationService>(
      SpendClassificationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
