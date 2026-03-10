/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { SessionTokenService } from './session-token.service';

describe('Service: SessionToken', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SessionTokenService]
    });
  });

  it('should ...', inject([SessionTokenService], (service: SessionTokenService) => {
    expect(service).toBeTruthy();
  }));
});
