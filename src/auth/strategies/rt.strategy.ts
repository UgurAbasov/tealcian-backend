import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PG_CONNECTION } from "../../constants";
import {WsException} from "@nestjs/websockets";


@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {


  constructor(@Inject(PG_CONNECTION) private pool: any) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.REFRESH_SECRET,
      ignoreExpiration: false
    });

  }

  async validate(payload: any) {
    const userId = payload.sub;
    const userQuery = {
      text: `SELECT * FROM users WHERE id = $1`,
      values: [userId]
    }

    const user = await this.pool.query(userQuery)
    if (user.rows.length === 0){
      throw new Error('hello');
    }
    return user.rows[0];
  }
}
