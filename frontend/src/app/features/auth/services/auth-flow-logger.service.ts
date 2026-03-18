import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthFlowLoggerService {
  private readonly enabled = !environment.production;

  info(message: string, context?: unknown): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: unknown): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: unknown): void {
    this.write('error', message, context);
  }

  private write(
    level: 'info' | 'warn' | 'error',
    message: string,
    context?: unknown,
  ): void {
    if (!this.enabled) {
      return;
    }

    if (typeof context === 'undefined') {
      console[level](`[AuthFlow] ${message}`);
      return;
    }

    console[level](`[AuthFlow] ${message}`, context);
  }
}
