import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * AdminGuard — second-stage guard.
 *
 * Use as: @UseGuards(JwtAuthGuard, AdminGuard)
 * JwtAuthGuard runs first and populates request.user. We just check the flag.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) throw new UnauthorizedException();
    if (!req.user.isAdmin) {
      throw new ForbiddenException({
        code: 'not_admin',
        message: 'Admin access required',
      });
    }
    return true;
  }
}
