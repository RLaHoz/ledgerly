import { inject, Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { defer, from, Observable, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { RuntimeConfigService } from 'src/app/core/config/runtime-config.service';
import { GoogleAuthCallbackEvent } from '../../models/google-auth.models';

const BROWSER_FINISHED_CANCEL_DELAY_MS = 750;

@Injectable({ providedIn: 'root' })
export class GoogleAuthUiService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly callbackSubject = new Subject<GoogleAuthCallbackEvent>();
  private readonly cancelledSubject = new Subject<void>();

  private appUrlOpenHandle?: PluginListenerHandle;
  private browserFinishedHandle?: PluginListenerHandle;
  private browserFinishedCancelTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private suppressNextBrowserFinishedCancellation = false;
  private initialized = false;

  readonly callback$ = this.callbackSubject.asObservable();
  readonly cancelled$ = this.cancelledSubject.asObservable();

  initialize(): Observable<void> {
    return defer(async () => {
      if (this.initialized) {
        return;
      }
      this.initialized = true;

      this.appUrlOpenHandle = await App.addListener('appUrlOpen', ({ url }) => {
        const event = this.parseCallbackUrl(url);
        if (event) {
          this.emitCallbackEvent(event);
        }
      });

      if (Capacitor.isNativePlatform()) {
        this.browserFinishedHandle = await Browser.addListener('browserFinished', () => {
          if (this.suppressNextBrowserFinishedCancellation) {
            this.suppressNextBrowserFinishedCancellation = false;
            return;
          }

          this.scheduleBrowserFinishedCancellation();
        });
      }

      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        const launchEvent = this.parseCallbackUrl(launch.url);
        if (launchEvent) {
          this.emitCallbackEvent(launchEvent);
        }
      }
    }).pipe(map(() => void 0));
  }

  openAuth(authorizeUrl: string): Observable<void> {
    if (Capacitor.isNativePlatform()) {
      return from(
        Browser.open({
          url: authorizeUrl,
          presentationStyle: 'fullscreen',
        }),
      ).pipe(map(() => void 0));
    }

    window.location.assign(authorizeUrl);
    return of(void 0);
  }

  closeAuth(): Observable<void> {
    if (!Capacitor.isNativePlatform()) {
      return of(void 0);
    }

    this.suppressNextBrowserFinishedCancellation = true;
    return from(Browser.close()).pipe(map(() => void 0));
  }

  parseCallbackFromUrl(url: string): GoogleAuthCallbackEvent | null {
    return this.parseCallbackUrl(url);
  }

  private parseCallbackUrl(url: string): GoogleAuthCallbackEvent | null {
    const parsed = new URL(url);
    const normalizedPath = normalizePathname(parsed.pathname);
    const allowedUniversalLinkOrigins = this.runtimeConfig.getUniversalLinkOrigins();

    const isNativeCallback =
      parsed.protocol === 'ledgerly:' &&
      parsed.hostname === 'auth' &&
      normalizedPath === '/google/callback';

    const isWebCallback =
      parsed.origin === window.location.origin &&
      normalizedPath === '/auth/google/callback';

    const isUniversalLinkCallback =
      /^https?:$/i.test(parsed.protocol) &&
      normalizedPath === '/auth/google/callback' &&
      allowedUniversalLinkOrigins.includes(parsed.origin);

    if (!isNativeCallback && !isWebCallback && !isUniversalLinkCallback) {
      return null;
    }

    return {
      rawUrl: url,
      state: parsed.searchParams.get('state'),
      code: parsed.searchParams.get('code'),
      error: parsed.searchParams.get('error'),
      errorDescription: parsed.searchParams.get('error_description'),
    };
  }

  private emitCallbackEvent(event: GoogleAuthCallbackEvent): void {
    this.clearPendingBrowserFinishedCancellation();
    this.callbackSubject.next(event);
  }

  private scheduleBrowserFinishedCancellation(): void {
    this.clearPendingBrowserFinishedCancellation();
    this.browserFinishedCancelTimeoutId = setTimeout(() => {
      this.browserFinishedCancelTimeoutId = null;
      this.cancelledSubject.next();
    }, BROWSER_FINISHED_CANCEL_DELAY_MS);
  }

  private clearPendingBrowserFinishedCancellation(): void {
    if (this.browserFinishedCancelTimeoutId === null) {
      return;
    }

    clearTimeout(this.browserFinishedCancelTimeoutId);
    this.browserFinishedCancelTimeoutId = null;
  }
}

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return '/';
  }

  return pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
}
