import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Observable } from 'rxjs';
import {
  BankAuthorizeUrlResponse,
  BankConsentVerificationResponse,
  VerifyBankConsentRequest,
} from '../models/bank.models';
import {
  CompleteOnboardingResponse,
  SessionResponse,
} from '../models/auth.models';
import { RuntimeConfigService } from 'src/app/core/config/runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfigService);

  get baseUrl(): string {
    return this.runtimeConfig.getApiUrl();
  }

  createAnonymousSession(deviceId?: string): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(
      `${this.baseUrl}/auth/session/anonymous`,
      { deviceId },
    );
  }

  refreshSession(refreshToken: string): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.baseUrl}/auth/session/refresh`, {
      refreshToken,
    });
  }

  logoutSession(refreshToken: string): Observable<{ success: true }> {
    return this.http.post<{ success: true }>(`${this.baseUrl}/auth/session/logout`, {
      refreshToken,
    });
  }

  getBankAuthorizeUrl(): Observable<BankAuthorizeUrlResponse> {
    const client = Capacitor.isNativePlatform() ? 'native' : 'web';
    return this.http.get<BankAuthorizeUrlResponse>(
      `${this.baseUrl}/auth/bankLoginUrl`,
      {
        params: { client },
        headers: { 'x-client-source': client },
      },
    );
  }

  verifyBankConsent(
    payload: VerifyBankConsentRequest,
  ): Observable<BankConsentVerificationResponse> {
    return this.http.post<BankConsentVerificationResponse>(
      `${this.baseUrl}/auth/bank-consent/verify`,
      payload,
    );
  }

  completeOnboarding(): Observable<CompleteOnboardingResponse> {
    return this.http.post<CompleteOnboardingResponse>(
      `${this.baseUrl}/auth/onboarding/complete`,
      {},
    );
  }

}
