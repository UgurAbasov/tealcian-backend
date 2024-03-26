import { GithubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { RtStrategy } from './strategies/rt.strategy';
import { AuthController } from './auth.controller';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AtStrategy } from './strategies/at.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { DbModule } from "../db/db.module";
import { RedisModule } from "@liaoliaots/nestjs-redis";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    DbModule,
    RedisModule.forRoot({
      config: {
        host: 'redis-17342.c14.us-east-1-2.ec2.cloud.redislabs.com',
        port: 17342,
        password: 'Uy99ubacRt3GDHYvv0tyruAZRUWHerwY'
      }
    })
  ],
  providers: [AuthService,AtStrategy, RtStrategy, GoogleStrategy, GithubStrategy],
  controllers: [AuthController]
})
export class AuthModule {}