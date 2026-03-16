import { computed, Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

type RuntimeConfig = {
  apiUrlWeb: string;
  apiUrlNative: string;
  universalLinkOrigins: string[];
};

const DEFAULT_API_URL = 'http://localhost:3000/api';
const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  apiUrlWeb: DEFAULT_API_URL,
  apiUrlNative: DEFAULT_API_URL,
  universalLinkOrigins: [],
};

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private readonly config = signal<RuntimeConfig>(DEFAULT_RUNTIME_CONFIG);
  private readonly selectedApiUrl = computed(() =>
    Capacitor.isNativePlatform()
      ? this.config().apiUrlNative
      : this.config().apiUrlWeb,
  );

  async load(): Promise<void> {
    if (typeof fetch === 'undefined') {
      return;
    }

    try {
      const response = await fetch('assets/runtime-config.json', {
        cache: 'no-store',
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as Partial<RuntimeConfig>;
      const apiUrlWeb =
        normalizeApiUrl(payload.apiUrlWeb) ?? DEFAULT_RUNTIME_CONFIG.apiUrlWeb;
      const apiUrlNative = normalizeApiUrl(payload.apiUrlNative) ?? apiUrlWeb;
      const universalLinkOrigins =
        normalizeOriginList(payload.universalLinkOrigins) ??
        DEFAULT_RUNTIME_CONFIG.universalLinkOrigins;

      this.config.set({
        apiUrlWeb,
        apiUrlNative,
        universalLinkOrigins,
      });
    } catch {
      // Keep defaults when runtime config is not available.
    }
  }

  getApiUrl(): string {
    return this.selectedApiUrl();
  }

  isLocalhostApiUrl(): boolean {
    return /:\/\/(?:localhost|127\.0\.0\.1)(?::|\/|$)/i.test(this.getApiUrl());
  }

  getUniversalLinkOrigins(): readonly string[] {
    return this.config().universalLinkOrigins;
  }
}

function normalizeApiUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function normalizeOriginList(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const origins = value
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));

  return [...new Set(origins)];
}

function normalizeOrigin(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}
