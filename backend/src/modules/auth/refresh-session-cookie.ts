import type { Response } from 'express';

const DEFAULT_REFRESH_COOKIE_NAME = 'ledgerly_refresh_token';
const DEFAULT_REFRESH_COOKIE_PATH = '/api/auth';
const DEFAULT_REFRESH_COOKIE_SAME_SITE = 'lax';

type SameSite = 'lax' | 'strict' | 'none';

export function setRefreshSessionCookie(
  res: Response,
  refreshToken: string,
): void {
  const options = resolveRefreshCookieOptions();
  res.cookie(resolveRefreshCookieName(), refreshToken, {
    httpOnly: true,
    sameSite: options.sameSite,
    secure: options.secure,
    maxAge: options.maxAgeMs,
    path: options.path,
    ...(options.domain ? { domain: options.domain } : {}),
  });
}

export function clearRefreshSessionCookie(res: Response): void {
  const options = resolveRefreshCookieOptions();
  res.clearCookie(resolveRefreshCookieName(), {
    httpOnly: true,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
    ...(options.domain ? { domain: options.domain } : {}),
  });
}

export function readRefreshSessionCookie(
  cookieHeader: string | string[] | undefined,
): string | null {
  const rawCookieHeader = Array.isArray(cookieHeader)
    ? cookieHeader.join(';')
    : cookieHeader;
  if (!rawCookieHeader) {
    return null;
  }

  const cookieName = resolveRefreshCookieName();
  const cookies = rawCookieHeader.split(';');
  for (const rawCookie of cookies) {
    const [rawName, ...rawValueParts] = rawCookie.split('=');
    if (!rawName || rawValueParts.length === 0) {
      continue;
    }

    if (rawName.trim() !== cookieName) {
      continue;
    }

    const value = rawValueParts.join('=').trim();
    if (!value) {
      return null;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

function resolveRefreshCookieName(): string {
  const configuredName = process.env.AUTH_REFRESH_COOKIE_NAME?.trim();
  return configuredName || DEFAULT_REFRESH_COOKIE_NAME;
}

function resolveRefreshCookieOptions(): {
  sameSite: SameSite;
  secure: boolean;
  maxAgeMs: number;
  path: string;
  domain?: string;
} {
  const configuredSameSite = process.env.AUTH_REFRESH_COOKIE_SAME_SITE
    ?.trim()
    .toLowerCase();
  const sameSite: SameSite =
    configuredSameSite === 'strict' || configuredSameSite === 'none'
      ? configuredSameSite
      : DEFAULT_REFRESH_COOKIE_SAME_SITE;
  const configuredSecure = process.env.AUTH_REFRESH_COOKIE_SECURE
    ?.trim()
    .toLowerCase();
  const secure =
    sameSite === 'none'
      ? true
      : configuredSecure === 'true'
        ? true
        : configuredSecure === 'false'
          ? false
          : process.env.NODE_ENV === 'production';
  const configuredPath = process.env.AUTH_REFRESH_COOKIE_PATH?.trim();
  const configuredDomain = process.env.AUTH_REFRESH_COOKIE_DOMAIN?.trim();

  return {
    sameSite,
    secure,
    maxAgeMs: resolveRefreshCookieMaxAgeMs(),
    path: configuredPath || DEFAULT_REFRESH_COOKIE_PATH,
    domain: configuredDomain || undefined,
  };
}

function resolveRefreshCookieMaxAgeMs(): number {
  const ttl = process.env.JWT_REFRESH_TTL?.trim().toLowerCase() ?? '30d';
  const parsed = /^(\d+)([smhd])$/.exec(ttl);
  if (!parsed) {
    return 30 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(parsed[1]);
  const unit = parsed[2];
  if (unit === 's') {
    return amount * 1000;
  }
  if (unit === 'm') {
    return amount * 60 * 1000;
  }
  if (unit === 'h') {
    return amount * 60 * 60 * 1000;
  }
  return amount * 24 * 60 * 60 * 1000;
}
