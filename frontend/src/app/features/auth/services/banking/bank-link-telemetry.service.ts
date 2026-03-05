import { Injectable } from "@angular/core";
import { BankLinkTelemetryEventName } from "../../models/bank.models";

@Injectable({ providedIn: 'root' })

export class BankLinkTelemetryService {
  emit(event: BankLinkTelemetryEventName, payload: Record<string, unknown> = {}): void {
    // Keep logs structured and safe (never log authorize URL token).
    console.info('[BankLinkTelemetry]', {
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }
}
