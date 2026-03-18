import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { RuntimeConfigService } from 'src/app/core/config/runtime-config.service';
import { LEGACY_LS_REFRESH_TOKEN_KEY } from '../store/auth-storage';
import { SessionTokenService } from './session-token.service';

describe('SessionTokenService', () => {
  let service: SessionTokenService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

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
        SessionTokenService,
      ],
    });

    service = TestBed.inject(SessionTokenService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('stores only the access token and removes the legacy refresh token', () => {
    localStorage.setItem(LEGACY_LS_REFRESH_TOKEN_KEY, 'legacy-refresh');

    service.setTokens({
      user: {
        id: 'user-1',
        roles: [],
        email: 'user@example.com',
        fullName: 'User Example',
        avatarUrl: null,
      },
      accessToken: 'access-1',
      accessTokenExpiresInSeconds: 900,
      onboardingCompleted: false,
      bankConnectionState: 'never_connected',
      hasConnectedBank: false,
    });

    expect(localStorage.getItem('ledgerly_access_token')).toBe('access-1');
    expect(localStorage.getItem(LEGACY_LS_REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('refreshes the access token using credentials without exposing a refresh token to storage', () => {
    let refreshedAccessToken: string | null | undefined;
    service.refreshAccessToken().subscribe((token) => {
      refreshedAccessToken = token;
    });

    const request = httpMock.expectOne('http://localhost:3000/api/auth/session/refresh');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.body).toEqual({});

    request.flush({
      user: {
        id: 'user-1',
        roles: [],
        email: 'user@example.com',
        fullName: 'User Example',
        avatarUrl: null,
      },
      accessToken: 'access-2',
      accessTokenExpiresInSeconds: 900,
      onboardingCompleted: false,
      bankConnectionState: 'connected',
      hasConnectedBank: true,
    });

    expect(refreshedAccessToken).toBe('access-2');
    expect(localStorage.getItem(LEGACY_LS_REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('clears the access token when refresh fails', () => {
    localStorage.setItem('ledgerly_access_token', 'access-stale');

    let refreshedAccessToken: string | null | undefined;
    service.refreshAccessToken().subscribe((token) => {
      refreshedAccessToken = token;
    });

    const request = httpMock.expectOne('http://localhost:3000/api/auth/session/refresh');
    request.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(refreshedAccessToken).toBeNull();
    expect(localStorage.getItem('ledgerly_access_token')).toBeNull();
  });
});
