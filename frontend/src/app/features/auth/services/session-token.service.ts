import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { LS_ACCESS_TOKEN_KEY } from '../store/auth.state';
import { SessionResponse } from '../models/auth.models';
import { RuntimeConfigService } from 'src/app/core/config/runtime-config.service';
import { LEGACY_LS_REFRESH_TOKEN_KEY } from '../store/auth-storage';



@Injectable({ providedIn: 'root' })
export class SessionTokenService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private refreshInFlight$: Observable<string | null> | null = null;

  readonly accessToken = signal<string | null>(localStorage.getItem(LS_ACCESS_TOKEN_KEY));

  constructor() {
    localStorage.removeItem(LEGACY_LS_REFRESH_TOKEN_KEY);
  }

  setTokens(session: SessionResponse): void {
    this.accessToken.set(session.accessToken);
    localStorage.setItem(LS_ACCESS_TOKEN_KEY, session.accessToken);
    localStorage.removeItem(LEGACY_LS_REFRESH_TOKEN_KEY);
  }

  clearTokens(): void {
    this.accessToken.set(null);
    localStorage.removeItem(LS_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_LS_REFRESH_TOKEN_KEY);
  }

  refreshAccessToken(): Observable<string | null> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    this.refreshInFlight$ = this.http
      .post<SessionResponse>(
        `${this.runtimeConfig.getApiUrl()}/auth/session/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map((session) => {
          this.setTokens(session);
          return session.accessToken;
        }),
        catchError(() => {
          this.clearTokens();
          return of(null);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.refreshInFlight$.subscribe({
      complete: () => {
        this.refreshInFlight$ = null;
      },
      error: () => {
        this.refreshInFlight$ = null;
      },
    });

    return this.refreshInFlight$;
  }
}
