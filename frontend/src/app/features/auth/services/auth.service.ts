import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { BankConsentVerificationResponse } from '../models/bank.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getBankAuthorizeUrl(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/auth/bankLoginUrl`);
  }

  verifyBankConsent(jobIds: string[]): Observable<BankConsentVerificationResponse> {
    return this.http.post<BankConsentVerificationResponse>(
      `${this.baseUrl}/auth/bank-consent/verify`,
      { jobIds },
    );
  }

}
