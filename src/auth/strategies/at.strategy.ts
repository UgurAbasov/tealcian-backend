import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable } from "@nestjs/common";
import { UnauthorizedException } from '@nestjs/common';
import { PG_CONNECTION } from "../../constants";
@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(PG_CONNECTION) private pool: any) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.ACCESS_SECRET,
    });
  }

  async validate(payload: any) {
    const userQuery = {
      text: `SELECT * FROM users WHERE id = $1`,
      values: [payload.sub]
    }

    const user = await this.pool.query(userQuery)
    if (user.rows.length === 0) {
        throw new UnauthorizedException();
      }
      return user;
  }
}