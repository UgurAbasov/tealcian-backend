import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';
  
  @Injectable()
  export class GithubOAuthGuard extends AuthGuard('github') {
    canActivate(context: ExecutionContext) {
      return super.canActivate(context);
    }
  
    handleRequest(err: any, user: any, info: any) {
      if (err || !user) {
        throw err || new UnauthorizedException();
      }
      return user;
    }
  }