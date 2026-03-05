/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { BasiqConsentUiService } from './basiq-consent-ui.service';

describe('Service: BankConsentFlow', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BasiqConsentUiService]
    });
  });

  it('should ...', inject([BasiqConsentUiService], (service: BasiqConsentUiService) => {
    expect(service).toBeTruthy();
  }));
});
