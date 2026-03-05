/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { BankLinkCoordinatorService } from './bank-link-coordinator.service';


describe('Service: BankLinkCoordinator', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BankLinkCoordinatorService]
    });
  });

  it('should ...', inject([BankLinkCoordinatorService], (service: BankLinkCoordinatorService) => {
    expect(service).toBeTruthy();
  }));
});
