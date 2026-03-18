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
import {
  CompleteGoogleAuthRequest,
  GoogleAuthorizeUrlResponse,
} from '../models/google-auth.models';
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

  refreshSession(): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(
      `${this.baseUrl}/auth/session/refresh`,
      {},
      { withCredentials: true },
    );
  }

  logoutSession(): Observable<{ success: true }> {
    return this.http.post<{ success: true }>(
      `${this.baseUrl}/auth/session/logout`,
      {},
      { withCredentials: true },
    );
  }

  startGoogleAuth(): Observable<GoogleAuthorizeUrlResponse> {
    const client = Capacitor.isNativePlatform() ? 'native' : 'web';
    return this.http.post<GoogleAuthorizeUrlResponse>(
      `${this.baseUrl}/auth/google/start`,
      { client },
      {
        headers: { 'x-client-source': client },
      },
    );
  }

  completeGoogleAuth(
    payload: CompleteGoogleAuthRequest,
  ): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(
      `${this.baseUrl}/auth/google/complete`,
      payload,
      { withCredentials: true },
    );
  }

  startBankConsent(): Observable<BankAuthorizeUrlResponse> {
    const client = Capacitor.isNativePlatform() ? 'native' : 'web';
    return this.http.post<BankAuthorizeUrlResponse>(
      `${this.baseUrl}/auth/bank-consent/start`,
      { client },
      {
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
      { withCredentials: true },
    );
  }

  completeOnboarding(): Observable<CompleteOnboardingResponse> {
    return this.http.post<CompleteOnboardingResponse>(
      `${this.baseUrl}/auth/onboarding/complete`,
      {},
    );
  }

}
