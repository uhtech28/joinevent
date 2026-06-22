import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Default-require-auth guard. Routes opt out via @Public() (see decorators/public.decorator).
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
