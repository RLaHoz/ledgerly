/* tslint:disable:no-unused-variable */

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, inject } from '@angular/core/testing';
import { SessionTokenService } from './session-token.service';

describe('Service: SessionToken', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SessionTokenService,
      ],
    });
  });

  it('should ...', inject([SessionTokenService], (service: SessionTokenService) => {
    expect(service).toBeTruthy();
  }));
});
