import { Injectable, inject } from '@angular/core';
import { fromEvent, merge, Subscription, throttleTime, timer } from 'rxjs';
import { AuthStore } from '../store/auth.store';
import { environment } from 'src/environments/environment';

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 1000;

@Injectable({ providedIn: 'root' })
export class SessionIdleTimeoutService {
  private readonly authStore = inject(AuthStore);
  private readonly idleTimeoutMs = resolveIdleTimeoutMs(
    environment.sessionIdleTimeoutMs,
  );
  private activitySubscription: Subscription | null = null;
  private idleTimerSubscription: Subscription | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const activity$ = merge(
      fromEvent(window, 'pointerdown'),
      fromEvent(window, 'touchstart'),
      fromEvent(window, 'keydown'),
      fromEvent(window, 'scroll'),
      fromEvent(window, 'focus'),
      fromEvent(document, 'visibilitychange'),
    ).pipe(
      throttleTime(ACTIVITY_THROTTLE_MS, undefined, {
        leading: true,
        trailing: true,
      }),
    );

    this.activitySubscription = activity$.subscribe(() => {
      this.resetIdleTimer();
    });

    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    this.idleTimerSubscription?.unsubscribe();
    this.idleTimerSubscription = timer(this.idleTimeoutMs).subscribe(() => {
      this.onInactivityTimeout();
    });
  }

  private onInactivityTimeout(): void {
    if (this.authStore.isLoggedIn() && this.authStore.hasConnectedBank()) {
      this.authStore.expireSessionByInactivity();
    }

    this.resetIdleTimer();
  }
}

function resolveIdleTimeoutMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  return DEFAULT_IDLE_TIMEOUT_MS;
}
