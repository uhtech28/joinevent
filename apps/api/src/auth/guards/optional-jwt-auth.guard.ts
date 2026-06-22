import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but lets the request through even without a token.
 * request.user is set if a valid token is present, otherwise undefined.
 * Use for endpoints whose behaviour changes when the user is signed in but
 * which work fine for anonymous clients (e.g. discovery feed personalisation).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err) throw err;
    return user as TUser; // user may be false/undefined — that's fine
  }
  // Don't throw on missing token; just continue.
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
