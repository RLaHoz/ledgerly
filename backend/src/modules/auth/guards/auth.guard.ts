import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { AuthUser } from '../interfaces/auth-user.interface';
// import { AuthService } from '../services/auth.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// interface RequestWithUser {
//   headers?: Record<string, string | string[] | undefined>;
//   user?: AuthUser;
// }

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // const request = context.switchToHttp().getRequest<RequestWithUser>();
    // request.user = this.authService.resolveUser(request);
    return true;
  }
}
