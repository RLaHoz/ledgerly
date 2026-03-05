// frontend/src/app/features/auth/services/bank-consent-flow.service.ts
import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { defer, from, Observable, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { BasiqConsentCallbackEvent } from '../../models/bank.models';


@Injectable({ providedIn: 'root' })
export class BasiqConsentUiService {
  // Stream for successful callback URL receptions.
  private readonly callbackSubject = new Subject<BasiqConsentCallbackEvent>();

  // Stream for user closing the in-app browser without finishing.
  private readonly cancelledSubject = new Subject<void>();

  private appUrlOpenHandle?: PluginListenerHandle;
  private browserFinishedHandle?: PluginListenerHandle;
  private initialized = false;

  readonly callback$ = this.callbackSubject.asObservable();
  readonly cancelled$ = this.cancelledSubject.asObservable();

  initialize(): Observable<void> {
    return defer(async () => {
      if (this.initialized) return;
      this.initialized = true;

      this.appUrlOpenHandle = await App.addListener('appUrlOpen', ({ url }) => {
        const event = this.parseCallbackUrl(url);
        if (event) this.callbackSubject.next(event);
      });

      if (Capacitor.isNativePlatform()) {
        this.browserFinishedHandle = await Browser.addListener(
          'browserFinished',
          () => this.cancelledSubject.next(),
        );
      }

      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        const launchEvent = this.parseCallbackUrl(launch.url);
        if (launchEvent) this.callbackSubject.next(launchEvent);
      }
    }).pipe(map(() => void 0));
  }

  openConsent(authorizeUrl: string): Observable<void> {
    if (Capacitor.isNativePlatform()) {
      return from(
        Browser.open({
          url: authorizeUrl,
          presentationStyle: 'fullscreen',
        }),
      ).pipe(map(() => void 0));
    }

    // Web fallback: navigate current tab.
    window.location.assign(authorizeUrl);
    return of(void 0);
  }

  closeConsent(): Observable<void> {
    if (!Capacitor.isNativePlatform()) return of(void 0);
    return from(Browser.close()).pipe(map(() => void 0));
  }

  destroy(): Observable<void> {
    return defer(async () => {
      await this.appUrlOpenHandle?.remove();
      await this.browserFinishedHandle?.remove();
      this.appUrlOpenHandle = undefined;
      this.browserFinishedHandle = undefined;
      this.initialized = false;
    }).pipe(map(() => void 0));
  }

  parseCallbackFromUrl(url: string): BasiqConsentCallbackEvent | null {
    return this.parseCallbackUrl(url);
  }

  private parseCallbackUrl(url: string): BasiqConsentCallbackEvent | null {
    const parsed = new URL(url);

    const isNativeCallback =
      parsed.protocol === 'ledgerly:' &&
      parsed.hostname === 'auth' &&
      parsed.pathname === '/callback';

    const isWebCallback =
      parsed.origin === window.location.origin &&
      parsed.pathname === '/auth/callback';

    if (!isNativeCallback && !isWebCallback) return null;

    const jobIdsRaw = parsed.searchParams.get('jobIds');

    return {
      rawUrl: url,
      state: parsed.searchParams.get('state'),
      jobId: parsed.searchParams.get('jobId'),
      jobIds: jobIdsRaw
        ? jobIdsRaw.split(',').map((v) => v.trim()).filter(Boolean)
        : [],
    };
  }
}
