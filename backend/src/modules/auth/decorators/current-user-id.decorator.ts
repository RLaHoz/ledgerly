import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { AuthUser } from '../interfaces/auth-user.interface';

type HeaderValue = unknown;

interface RequestWithUser {
  user?: AuthUser;
  headers?: Record<string, HeaderValue>;
}

/**
 * Backward-compatible:
 * 1) uses request.user.id (from guard)
 * 2) fallback to x-user-id header
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();

    if (request.user?.id) {
      return request.user.id;
    }

    const raw = request.headers?.['x-user-id'];
    const value = Array.isArray(raw) ? raw[0] : raw;

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    throw new BadRequestException('Missing authenticated user id');
  },
);
