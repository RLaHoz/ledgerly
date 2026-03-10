import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  BankAuthorizeUrlResponse,
  BankConsentVerificationResponse,
  VerifyBankConsentRequest,
} from '../models/bank.models';
import {
  CompleteOnboardingResponse,
  SessionResponse,
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

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
    return this.http.get<BankAuthorizeUrlResponse>(`${this.baseUrl}/auth/bankLoginUrl`);
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
