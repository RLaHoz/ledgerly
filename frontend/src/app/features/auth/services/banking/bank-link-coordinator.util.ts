import {
  BankConsentVerificationResponse,
  BasiqConsentCallbackEvent,
} from '../../models/bank.models';

export type ConsentCallbackValidationResult =
  | {
      ok: true;
      state: string;
      jobIds: string[];
    }
  | {
      ok: false;
      message: string;
    };

export function validateConsentCallbackEvent(
  event: BasiqConsentCallbackEvent,
  expectedState: string | null,
  allowNativeStateRecovery: boolean,
): ConsentCallbackValidationResult {
  if (
    !event.state ||
    (!allowNativeStateRecovery &&
      (!expectedState || event.state !== expectedState))
  ) {
    return {
      ok: false,
      message: 'Invalid consent callback state',
    };
  }

  const jobIds = normalizeConsentJobIds(event);
  if (jobIds.length === 0) {
    return {
      ok: false,
      message: 'No consent jobs returned by provider',
    };
  }

  return {
    ok: true,
    state: event.state,
    jobIds,
  };
}

export function isPendingVerificationResult(
  result: Pick<BankConsentVerificationResponse, 'success' | 'pendingJobIds'>,
): boolean {
  return !result.success && result.pendingJobIds.length > 0;
}

function normalizeConsentJobIds(
  event: Pick<BasiqConsentCallbackEvent, 'jobId' | 'jobIds'>,
): string[] {
  return [
    ...new Set([...(event.jobIds ?? []), ...(event.jobId ? [event.jobId] : [])]),
  ];
}
