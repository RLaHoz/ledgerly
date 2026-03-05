/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { FinancialDataService } from './financial-data.service';

describe('Service: FinancialData', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FinancialDataService]
    });
  });

  it('should ...', inject([FinancialDataService], (service: FinancialDataService) => {
    expect(service).toBeTruthy();
  }));
});
