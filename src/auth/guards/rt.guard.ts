import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';
  
  @Injectable()
  export class RtGuard extends AuthGuard('jwt-refresh') {
    canActivate(context: ExecutionContext) {
      return super.canActivate(context);
    }
  
    handleRequest(err: any, user: any, info: any) {
      if (err || !user) {
        throw new UnauthorizedException();
      }
      return user;
    }
  }