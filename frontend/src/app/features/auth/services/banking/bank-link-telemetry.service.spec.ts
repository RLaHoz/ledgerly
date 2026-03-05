/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { BankLinkTelemetryService } from './bank-link-telemetry.service';

describe('Service: BankLinkTelemetry', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BankLinkTelemetryService]
    });
  });

  it('should ...', inject([BankLinkTelemetryService], (service: BankLinkTelemetryService) => {
    expect(service).toBeTruthy();
  }));
});
