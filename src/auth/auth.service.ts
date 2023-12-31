
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { HttpException, HttpStatus, Injectable, Request, Res, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Tokens } from './tokens.type';
import { Prisma } from '@prisma/client';
import { kMaxLength } from 'buffer';
@Injectable()
export class AuthService {
    constructor(private jwtService:JwtService,
        private prismaService: PrismaService) {}
        async sign(registerDto: RegisterDto): Promise<Tokens> {
            try {

            const getUser = await this.prismaService.user.findUnique({
                where: {
                  email: registerDto.email
                }
              })
    

              if(getUser){
                throw new HttpException('This user already exists', HttpStatus.BAD_REQUEST);
                return;
              }
    
              const password = registerDto.password
              const salt = await bcrypt.genSalt(10)
              const passwordHash = await bcrypt.hash(password, salt)
    
              const result = await this.prismaService.user.create({
                data: {
                  email: registerDto.email,
                  name: registerDto.name,
                  password: passwordHash,
                }
              });
              
              const user = await this.prismaService.user.findUnique({
                where: {
                  email: registerDto.email
                }
              })


              const userId = user.id
              const accessToken = this.jwtService.sign({sub: user.id, email: user.email }, {secret: process.env.ACCESS_SECRET, expiresIn: '15m'})
              const refreshToken = this.jwtService.sign({sub: user.id, email: user.email }, {secret: process.env.REFRESH_SECRET, expiresIn: '30d'})
              const refreshAdd = await this.prismaService.user.update({
                where: {
                id: userId
                },
                data: {
                    refreshToken: refreshToken
                }
              });
    
              return {
                accessToken,
                refreshToken
              }
    
            } catch (e) {
                throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }

        async login(loginDto: LoginDto): Promise<Tokens> {
            try {
              const isUser = await this.prismaService.user.findUnique({
                where: {
                  email: loginDto.email
                }
              })
              if(!isUser){
                throw new HttpException({
                  massage: `Make sure that you wrote correct email or password, because we couldn't find this account.`,
                  solution: 'Password need to be minimum with 8 characters with big letter and number, if you registered with another resource then you need to log in with this resource.'
                }, HttpStatus.BAD_REQUEST);
              }
      
              const isValidPass = await bcrypt.compare(loginDto.password, isUser.password)
                if(!isValidPass){
                  throw new HttpException('Email or password is not right', HttpStatus.BAD_REQUEST);
          
                  return;
                }
              const accessToken = this.jwtService.sign({sub: isUser.id, email: isUser.email }, {secret: process.env.ACCESS_SECRET, expiresIn: '15m'})
              const refreshToken = this.jwtService.sign({sub: isUser.id, email: isUser.email }, {secret: process.env.REFRESH_SECRET, expiresIn: '30d'})
       
                const refreshAdd = await this.prismaService.user.update({
                  where: {
                  email: loginDto.email
                  },
                  data: {
                      refreshToken
                  }
                });
      
                return {
                  refreshToken,
                  accessToken
                }
                
            } catch (e) {
                throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
            }

            
          }

          async refreshToken(refreshTokenObj: {refreshToken: string}): Promise<Tokens> {
      
            const refreshAdd = await this.prismaService.user.findUnique({
               where: {
                refreshToken: refreshTokenObj.refreshToken
               }
             });
            
            if (!refreshAdd) {
              throw new HttpException('Unauthoraized', HttpStatus.BAD_REQUEST);
            }
          
            const decoded = this.jwtService.verify(refreshTokenObj.refreshToken, {secret: process.env.REFRESH_SECRET});
            if (!decoded) {
              throw new HttpException('Token is not valid', HttpStatus.BAD_REQUEST);
            }
          
            const newAccessToken = this.jwtService.sign({sub: refreshAdd.id, email: refreshAdd.email }, {secret: process.env.ACCESS_SECRET, expiresIn: '15m'})
              const newRefreshToken = this.jwtService.sign({sub: refreshAdd.id, email: refreshAdd.email }, {secret: process.env.REFRESH_SECRET, expiresIn: '30d'})
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
          }

          async getUser(@Request() req) {
            let userId = req.user.id
      
          const getUser = await this.prismaService.user.findUnique({
            where: {
              id: userId
            }
          })
    
          if(!getUser){
            throw new HttpException('Данный пользователь не найден', HttpStatus.BAD_REQUEST);
            return;
          };
          return getUser
        }

        async googleRegister(@Request() req, @Res() res) {
          try {
          const profile = req.user
          if (!profile) {
            return 'No user from google';
          }
          const findUser = await this.prismaService.user.findUnique({
            where: {
              email: profile.emails[0].value
            }
          })

          if(findUser){
            throw new HttpException('This user already exist', HttpStatus.BAD_REQUEST);
          }

          const result = await this.prismaService.user.create({
            data: {
              email: profile.emails[0].value,
              name: profile.displayName
            }
          })


          const user = await this.prismaService.user.findUnique({
            where: {
              email: result.email
            }
          })

          const accessToken = this.jwtService.sign({sub: user.id, email: user.email }, {secret: process.env.ACCESS_SECRET, expiresIn: '15m'})
          const refreshToken = this.jwtService.sign({sub: user.id, email: user.email }, {secret: process.env.REFRESH_SECRET, expiresIn: '30d'})

          const addRefresh = await this.prismaService.user.update({
            where: {
              email: user.email
            },
            data: {
              refreshToken
            }
          })

          res.redirect(`https://tealcian-frontend.vercel.app/auth/login?accessToken=${accessToken}&refreshToken=${refreshToken}`)
          return {
            accessToken,
            refreshToken,
            register: 'success',
          }
        } catch(e) {
          throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        }

        async githubRegister(req) {
          try {
          const profile = req.user
          if (!profile) {
            return 'No user from github';
          }
          

          const findUser = await this.prismaService.user.findUnique({
            where: {
              email: profile.emails[0].value
            }
          })

          if(findUser){
            throw new HttpException('This user already exist', HttpStatus.BAD_REQUEST);
          }

          const result = await this.prismaService.user.create({
            data: {
              email: profile.emails[0].value,
              name: profile.displayName
            }
          })


          const user = await this.prismaService.user.findUnique({
            where: {
              email: result.email
            }
          })

          const accessToken = this.jwtService.sign({sub: user.id, email: user.email }, {secret: process.env.ACCESS_SECRET, expiresIn: '15m'})
          const refreshToken = this.jwtService.sign({sub: user.id, email: user.email }, {secret: process.env.REFRESH_SECRET, expiresIn: '30d'})

          const addRefresh = await this.prismaService.user.update({
            where: {
              email: user.email
            },
            data: {
              refreshToken
            }
          })

          return {
            accessToken,
            refreshToken,
            register: 'success'
          }
        } catch(e) {
          throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        } 
 }