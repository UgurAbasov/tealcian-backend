import { GithubOAuthGuard } from './guards/github.guard';
import { GoogleOAuthGuard } from './guards/google.guard';
import { RtGuard } from './guards/rt.guard';
import { Tokens } from './tokens.type';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Body, Controller, Post, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AtGuard } from './guards/at.guard';
import { Request } from '@nestjs/common';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService
    ) {}


    @Post('sign')
    sign(@Body() registerDto: RegisterDto): Promise<Tokens> {
        return this.authService.sign(registerDto);
    }

    @Post('login')
    login(@Body() loginDto: LoginDto): Promise<Tokens> {
        return this.authService.login(loginDto);
    }

    @UseGuards(AtGuard)
    @Get('profile')
    getUser(@Request() req) {
        return this.authService.getUser(req)
    }
    

    @UseGuards(RtGuard)
    @Post('refresh')
    getRefresh(@Body() refreshTokenObj: {refreshToken: string}) {
        return this.authService.refreshToken(refreshTokenObj)
    }

   
  @Get('google-redirect')
  @UseGuards(GoogleOAuthGuard)
  googleRegister(@Request() req) {
    return this.authService.googleRegister(req);
  }
 
  @Get('github-redirect')
  @UseGuards(GithubOAuthGuard)
  githubRegister(@Request() req) {
    return this.authService.githubRegister(req);
  }

}