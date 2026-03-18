import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api';
const AUTO_NATIVE_IP_DISABLED = process.env.LEDGERLY_AUTO_NATIVE_IP === 'false';
const PREFERRED_NATIVE_INTERFACES = ['en0', 'en1', 'eth0', 'wlan0'];

const outputPath = resolve(process.cwd(), 'src/assets/runtime-config.json');
const existingConfig = readExistingRuntimeConfig(outputPath);

const sharedApiUrl = normalizeApiUrl(process.env.LEDGERLY_API_URL);
const apiUrlWeb =
  normalizeApiUrl(process.env.LEDGERLY_API_URL_WEB) ??
  existingConfig.apiUrlWeb ??
  sharedApiUrl ??
  DEFAULT_API_URL;
const explicitNativeApiUrl = normalizeApiUrl(process.env.LEDGERLY_API_URL_NATIVE);
const lanIp = AUTO_NATIVE_IP_DISABLED ? null : detectLanIpv4();
const autoNativeApiUrl = lanIp ? toNativeReachableApiUrl(apiUrlWeb, lanIp) : null;
const apiUrlNative =
  explicitNativeApiUrl ??
  autoNativeApiUrl ??
  existingConfig.apiUrlNative ??
  apiUrlWeb;
const universalLinkOrigins =
  parseOriginList(process.env.LEDGERLY_UNIVERSAL_LINK_ORIGINS) ??
  existingConfig.universalLinkOrigins ??
  [];

const runtimeConfig = {
  apiUrlWeb,
  apiUrlNative,
  universalLinkOrigins,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(runtimeConfig, null, 2)}\n`, 'utf8');

console.log(`[runtime-config] generated ${outputPath}`);
console.log(`[runtime-config] web=${apiUrlWeb}`);
console.log(`[runtime-config] native=${apiUrlNative}`);
console.log(
  `[runtime-config] universalLinkOrigins=${universalLinkOrigins.join(',') || '(none)'}`,
);
if (explicitNativeApiUrl) {
  console.log('[runtime-config] native source=LEDGERLY_API_URL_NATIVE');
} else if (autoNativeApiUrl) {
  console.log(
    `[runtime-config] native source=auto-lan-ip (${lanIp})`,
  );
} else if (AUTO_NATIVE_IP_DISABLED) {
  console.log('[runtime-config] auto native ip is disabled (LEDGERLY_AUTO_NATIVE_IP=false)');
} else {
  console.log('[runtime-config] native source=existing/runtime fallback');
}

function normalizeApiUrl(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function readExistingRuntimeConfig(path) {
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      apiUrlWeb: normalizeApiUrl(parsed?.apiUrlWeb),
      apiUrlNative: normalizeApiUrl(parsed?.apiUrlNative),
      universalLinkOrigins: normalizeOriginList(parsed?.universalLinkOrigins),
    };
  } catch {
    return {
      apiUrlWeb: null,
      apiUrlNative: null,
      universalLinkOrigins: null,
    };
  }
}

function toNativeReachableApiUrl(apiUrl, lanIp) {
  const normalized = normalizeApiUrl(apiUrl);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    if (/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
      parsed.hostname = lanIp;
      return normalizeApiUrl(parsed.toString());
    }

    return normalizeApiUrl(parsed.toString());
  } catch {
    return normalized;
  }
}

function detectLanIpv4() {
  const interfaces = networkInterfaces();
  const preferred = pickPreferredLanAddress(interfaces);
  if (preferred) {
    return preferred;
  }

  const allAddresses = Object.values(interfaces)
    .flatMap((entries) => entries ?? [])
    .map((entry) => entry?.address)
    .filter((value) => typeof value === 'string' && isUsableLanIpv4(value));

  return allAddresses[0] ?? null;
}

function pickPreferredLanAddress(interfaces) {
  for (const ifaceName of PREFERRED_NATIVE_INTERFACES) {
    const entries = interfaces[ifaceName] ?? [];
    for (const entry of entries) {
      if (!entry || !isIpv4Family(entry.family) || entry.internal) {
        continue;
      }

      if (isUsableLanIpv4(entry.address)) {
        return entry.address;
      }
    }
  }

  return null;
}

function isIpv4Family(family) {
  return family === 'IPv4' || family === 4;
}

function isUsableLanIpv4(address) {
  if (typeof address !== 'string') {
    return false;
  }

  if (/^127\./.test(address) || /^169\.254\./.test(address)) {
    return false;
  }

  return (
    /^10\./.test(address) ||
    /^192\.168\./.test(address) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function parseOriginList(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const origins = value
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter((entry) => Boolean(entry));

  return origins.length > 0 ? [...new Set(origins)] : null;
}

function normalizeOriginList(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const origins = value
    .map((entry) => normalizeOrigin(entry))
    .filter((entry) => Boolean(entry));
  return [...new Set(origins)];
}

function normalizeOrigin(value) {
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
