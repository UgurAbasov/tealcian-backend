
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { HttpException, HttpStatus, Inject, Injectable, Request, Res, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from 'bcryptjs';
import { Tokens } from './tokens.type';
import * as nodemailer from 'nodemailer';
import { PG_CONNECTION } from "../constants";
@Injectable()
export class AuthService {
    constructor(private jwtService:JwtService, @Inject(PG_CONNECTION) private pool: any) {}
        async sign(registerDto: RegisterDto): Promise<Tokens> {
            try {
              const getUserQuery = {
                text: `SELECT * FROM users WHERE email = $1 OR nickname = $2`,
                values: [registerDto.email, registerDto.nickname]
              }

              const getUser = await this.pool.query(getUserQuery)

              if(getUser.rows.length > 0) {
                throw new HttpException('This user already exists', HttpStatus.BAD_REQUEST);
              }

              const password = registerDto.password
              const salt = await bcrypt.genSalt(10)
              const passwordHash = await bcrypt.hash(password, salt)
              const creatingDataQuery = {
                text: `INSERT INTO users(first_name, last_name, email, password, createdat, nickname) VALUES($1, $2, $3, $4, $5, $6) RETURNING id`,
                values: [registerDto.firstName, registerDto.lastName , registerDto.email, passwordHash, new Date().toISOString().slice(0, 19).replace('T', ' '), registerDto.nickname]
              }
              const creatingData = await this.pool.query(creatingDataQuery)

              const userId = creatingData.rows[0].id
              const accessToken = this.jwtService.sign({sub: userId}, {secret: process.env.ACCESS_SECRET, expiresIn: '15m'})
              const refreshToken = this.jwtService.sign({sub: userId}, {secret: process.env.REFRESH_SECRET, expiresIn: '30d'})
              const refreshQuery = {
              text: `UPDATE users
              SET refreshToken = $1
              WHERE id = $2`,
              values: [refreshToken, userId]
              }
              await this.pool.query(refreshQuery)

              // var transporter = nodemailer.createTransport({
              //   service: 'gmail',
              //   auth: {
              //     user: 'ugurabbasov65@gmail.com',
              //     pass: 'ugurpcoder08'
              //   }
              // });
              //
              // var mailOptions = {
              //   from: 'ugurabbasov65@gmail.com',
              //   to: registerDto.email,
              //   subject: 'Sending Email test',
              //   text: 'That was easy!'
              // };
              //
              // transporter.sendMail(mailOptions, function(error, info){
              //   if (error) {
              //     console.log(error);
              //   } else {
              //     console.log('Email sent: ' + info.response);
              //   }
              // });


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
              const isUserQuery = {
                text: `SELECT * FROM users WHERE email = $1 OR nickname = $1`,
                values: [loginDto.email]
              }
              const isUser = await this.pool.query(isUserQuery)
              if(isUser.rows.length === 0){
                throw new HttpException({
                  massage: `Make sure that you wrote correct email or password, because we couldn't find this account.`
                }, HttpStatus.BAD_REQUEST);
              }

              if(isUser.rows[0].password === null){
                throw new HttpException({
                  massage: `Make sure that you registered from our platform.`,
                  solution: 'If you registered from another platform for example from google then you need to login from google also.'
                }, HttpStatus.BAD_REQUEST);
              }


              const isValidPass = await bcrypt.compare(loginDto.password, isUser.rows[0].password)
                if(!isValidPass){
                  throw new HttpException({
                    massage: `Make sure that you wrote correct email or password, because we couldn't find this user.`,
                    solution: 'Password need to be minimum with 8 characters with big letter and number, if you registered with another resource then you need to log in with this resource.'
                  }, HttpStatus.BAD_REQUEST);
                }
                const userId = isUser.rows[0].id
              const accessToken = this.jwtService.sign({sub: userId}, {secret: process.env.ACCESS_SECRET, expiresIn: '15m'})
              const refreshToken = this.jwtService.sign({sub: userId}, {secret: process.env.REFRESH_SECRET, expiresIn: '30d'})
              const refreshQuery = {
                text: `UPDATE users
              SET refreshToken = $1
              WHERE id = $2`,
                values: [refreshToken, userId]
              }
              await this.pool.query(refreshQuery)
                return {
                  accessToken,
                  refreshToken,
                }
            } catch (e) {
                throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
            }
          }

          async refreshToken(@Request() req) {
            const user = req.user
          
            const newAccessToken = this.jwtService.sign({sub: user.rows[0].id }, {secret: process.env.ACCESS_SECRET, expiresIn: '15m'})
            const newRefreshToken = this.jwtService.sign({sub: user.rows[0].id}, {secret: process.env.REFRESH_SECRET, expiresIn: '30d'})
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
          }

          async getUser(@Request() req) {
            let user = req.user
          if(!user){
            return 1
          }
          return {
            id: user.rows[0].id,
            first_name: user.rows[0].first_name,
            last_name: user.rows[0].last_name,
            email: user.rows[0].email,
            avatar: user.rows[0].avatar,
            nickname: user.rows[0].nickname,
            createdAt: user.rows[0].createdat
          }
        }

        async googleRegister(@Request() req, @Res() res) {
          try {
          const { given_name, family_name, picture, email} = req.user._json

            if (!req.user._json) {
            return 'No user from google';
          }

            const findUserQuery = {
              text: `SELECT * FROM users WHERE email = $1`,
              values: [email]
            }
          let data = await this.pool.query(findUserQuery)

          if(data.rows.length === 0) {
            const creatingDataQuery = {
              text: `INSERT INTO users(first_name, last_name, email, createdat, avatar) VALUES($1, $2, $3, $4, $5) RETURNING id`,
              values: [given_name, family_name , email, new Date().toISOString().slice(0, 19).replace('T', ' '), picture]
            }
            data = await this.pool.query(creatingDataQuery)
          }

          const accessToken = this.jwtService.sign({sub: data.rows[0].id }, {secret: process.env.ACCESS_SECRET, expiresIn: '15m'})
          const refreshToken = this.jwtService.sign({sub: data.rows[0].id }, {secret: process.env.REFRESH_SECRET, expiresIn: '30d'})

            const refreshQuery = {
              text: `UPDATE users
              SET refreshToken = $1
              WHERE id = $2`,
              values: [refreshToken, data.rows[0].id]
            }
            await this.pool.query(refreshQuery)

          res.redirect(`${process.env.FRONTEND_URL}/auth/login?accessToken=${accessToken}&refreshToken=${refreshToken}`)
        } catch(e) {
          throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        }

        async githubRegister(req,  @Res() res) {
          try {
            const { name, avatar_url } = req.user._json
            const email =req.user.emails[0].value
          if (!req.user._json) {
            throw new HttpException('No account', HttpStatus.INTERNAL_SERVER_ERROR);
          }

            const findUserQuery = {
              text: `SELECT * FROM users WHERE email = $1`,
              values: [email]
            }
            let data = await this.pool.query(findUserQuery)
            if(data.rows.length === 0){
              const creatingDataQuery = {
                text: `INSERT INTO users(first_name, last_name, email, createdat, avatar) VALUES($1, $2, $3, $4, $5) RETURNING id`,
                values: [name.split(' ')[0], name.split(' ')[1] , email, new Date().toISOString().slice(0, 19).replace('T', ' '), avatar_url]
              }
              data = await this.pool.query(creatingDataQuery)
          }

          const accessToken = this.jwtService.sign({sub: data.rows[0].id}, {secret: process.env.ACCESS_SECRET, expiresIn: '15m'})
          const refreshToken = this.jwtService.sign({sub: data.rows[0].id}, {secret: process.env.REFRESH_SECRET, expiresIn: '30d'})

            const refreshQuery = {
              text: `UPDATE users
              SET refreshToken = $1
              WHERE id = $2`,
              values: [refreshToken, data.rows[0].id]
            }
            await this.pool.query(refreshQuery)

          res.redirect(`${process.env.FRONTEND_URL}/auth/login?accessToken=${accessToken}&refreshToken=${refreshToken}`)
        } catch(e) {
          throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        } 
 }