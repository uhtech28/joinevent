import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { loadEnv } from '../../env';

type JwtPayload = { sub: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly log = new Logger(JwtStrategy.name);

  constructor(private readonly db: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: loadEnv().JWT_SECRET,
    });
  }

  // Whatever this returns is set on request.user. We attach the DB row.
  async validate(payload: JwtPayload) {
    const user = await this.db.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      this.log.warn(`JWT validate: user ${payload.sub} not found in DB`);
      throw new UnauthorizedException({ code: 'user_not_found' });
    }
    if (user.deletedAt) {
      this.log.warn(`JWT validate: user ${payload.sub} is soft-deleted (deletedAt=${user.deletedAt.toISOString()})`);
      throw new UnauthorizedException({ code: 'user_inactive' });
    }
    return user;
  }
}
