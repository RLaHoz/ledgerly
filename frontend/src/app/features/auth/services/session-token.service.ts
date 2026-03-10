import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LS_ACCESS_TOKEN_KEY, LS_REFRESH_TOKEN_KEY } from '../store/auth.state';
import { SessionResponse } from '../models/auth.models';



@Injectable({ providedIn: 'root' })
export class SessionTokenService {
  private readonly httpBackend = inject(HttpBackend);
  private readonly refreshTokenHttpInstance = new HttpClient(this.httpBackend);
  private refreshInFlight$: Observable<string | null> | null = null;

  readonly accessToken = signal<string | null>(localStorage.getItem(LS_ACCESS_TOKEN_KEY));
  readonly refreshToken = signal<string | null>(localStorage.getItem(LS_REFRESH_TOKEN_KEY));

  setTokens(session: SessionResponse): void {
    this.accessToken.set(session.accessToken);
    this.refreshToken.set(session.refreshToken);

    localStorage.setItem(LS_ACCESS_TOKEN_KEY, session.accessToken);
    localStorage.setItem(LS_REFRESH_TOKEN_KEY, session.refreshToken);
  }

  clearTokens(): void {
    this.accessToken.set(null);
    this.refreshToken.set(null);
    localStorage.removeItem(LS_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LS_REFRESH_TOKEN_KEY);
  }

  refreshAccessToken(): Observable<string | null> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    const refreshToken = this.refreshToken();
    if (!refreshToken) {
      return of(null);
    }

    this.refreshInFlight$ = this.refreshTokenHttpInstance
      .post<SessionResponse>(`${environment.apiUrl}/auth/session/refresh`, { refreshToken })
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
