import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Pulls the authenticated user off the request inside a controller.
 *
 *   @Get('me')
 *   me(@CurrentUser() user: User) { ... }
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});
