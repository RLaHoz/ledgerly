import { Capacitor } from '@capacitor/core';
import { TimeoutError } from 'rxjs';

export function resolveAuthErrorMessage(input: {
  error: unknown;
  fallback: string;
  timeoutMs: number;
  apiUrl: string;
  isLocalhostApiUrl: boolean;
}): string {
  if (input.error instanceof TimeoutError) {
    return `Request timed out after ${input.timeoutMs / 1000}s. Check backend connectivity at ${input.apiUrl}.`;
  }

  const status =
    typeof input.error === 'object' &&
    input.error !== null &&
    'status' in input.error &&
    typeof input.error.status === 'number'
      ? input.error.status
      : null;

  if (status === 0 && Capacitor.isNativePlatform()) {
    if (input.isLocalhostApiUrl) {
      return 'Cannot reach backend from native app using localhost. Set LEDGERLY_API_URL_NATIVE to your Mac LAN IP before build.';
    }

    return `Cannot reach backend at ${input.apiUrl}. Ensure iPhone and Mac are on the same Wi-Fi, backend is running, and port 3000 is reachable.`;
  }

  if (input.error instanceof Error && input.error.message.trim().length > 0) {
    return input.error.message;
  }

  return input.fallback;
}

export function isUnauthorizedHttpError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 401
  );
}
