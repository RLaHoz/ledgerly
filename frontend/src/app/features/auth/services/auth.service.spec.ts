import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { RuntimeConfigService } from 'src/app/core/config/runtime-config.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: RuntimeConfigService,
          useValue: {
            getApiUrl: () => 'http://localhost:3000/api',
          },
        },
        AuthService,
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('refreshes sessions with credentials and no refresh token in the body', () => {
    service.refreshSession().subscribe();

    const request = httpMock.expectOne('http://localhost:3000/api/auth/session/refresh');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expect(request.request.withCredentials).toBeTrue();

    request.flush({});
  });

  it('completes Google auth with credentials so the refresh cookie can be set', () => {
    service
      .completeGoogleAuth({
        state: 'state-1',
        code: 'code-1',
        error: undefined,
        errorDescription: undefined,
      })
      .subscribe();

    const request = httpMock.expectOne('http://localhost:3000/api/auth/google/complete');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();

    request.flush({});
  });
});
