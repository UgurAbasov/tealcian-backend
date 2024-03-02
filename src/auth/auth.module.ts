import { GithubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { RtStrategy } from './strategies/rt.strategy';
import { AuthController } from './auth.controller';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AtStrategy } from './strategies/at.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AppModule } from "../app.module";
import { DbModule } from "../db/db.module";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    DbModule
  ],
  providers: [AuthService,AtStrategy, RtStrategy, GoogleStrategy, GithubStrategy],
  controllers: [AuthController]
})
export class AuthModule {}