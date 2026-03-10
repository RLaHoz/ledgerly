import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { SessionTokenService } from 'src/app/features/auth/services/session-token.service';

function isAuthSessionEndpoint(url: string): boolean {
  return (
    url.includes('/auth/session/anonymous') ||
    url.includes('/auth/session/refresh') ||
    url.includes('/auth/session/logout')
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionTokenService = inject(SessionTokenService);
  const router = inject(Router);

  const accessToken = sessionTokenService.accessToken();

  const request = accessToken
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${accessToken}` },
      })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      const httpError = error as HttpErrorResponse;
      if (httpError.status !== 401 || isAuthSessionEndpoint(req.url)) {
        return throwError(() => error);
      }

      return sessionTokenService.refreshAccessToken().pipe(
        switchMap((newAccessToken) => {
          if (!newAccessToken) {
            void router.navigateByUrl('/auth', { replaceUrl: true });
            return throwError(() => error);
          }

          return next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${newAccessToken}` },
            }),
          );
        }),
        catchError((refreshError) => {
          sessionTokenService.clearTokens();
          void router.navigateByUrl('/auth', { replaceUrl: true });
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
