import { PrismaService } from '../../prisma/prisma.service';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ForbiddenException, Injectable } from '@nestjs/common';


type JwtPayload = {
    email: string
    sub: number
}

type JwtPayloadWithRt = JwtPayload & {refreshToken: string}

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  private extractTokenFromRequest(request: Request): string | undefined {
    const refreshToken = request.body.refreshToken; // Предполагается, что refreshToken находится в поле 'refreshToken' тела запроса
    return refreshToken;
  }

  constructor(prismaService: PrismaService) {
    super({
      jwtFromRequest: (request: Request) => this.extractTokenFromRequest(request),
      secretOrKey: process.env.REFRESH_SECRET, 
      passReqToCallback: true,
    });

  }

  validate(req: Request, payload: JwtPayload): JwtPayloadWithRt {
    const refreshToken = this.extractTokenFromRequest(req);
 
    if (!refreshToken) throw new ForbiddenException('Refresh token expired');

    return {
      ...payload,
      refreshToken,
    };
  }
}
