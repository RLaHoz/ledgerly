import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ headers?: Record<string, unknown> }>();
    const userId = request.headers?.['x-user-id'];

    if (typeof userId !== 'string' || !userId.trim()) {
      throw new BadRequestException('Missing x-user-id header');
    }

    return userId;
  },
);
