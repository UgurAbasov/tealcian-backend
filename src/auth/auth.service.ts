
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { HttpException, HttpStatus, Inject, Injectable, Request, Res, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from 'bcryptjs';
import { Tokens } from './tokens.type';
import * as nodemailer from 'nodemailer';
import { PG_CONNECTION } from "../constants";
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
    constructor(private jwtService:JwtService, @Inject(PG_CONNECTION) private pool: any, @InjectRedis() private readonly redis: Redis) {}

  async sign(registerDto: RegisterDto): Promise<Tokens> {
            try {
              const getUserQuery = {
                text: `SELECT * FROM users WHERE nickname = $1`,
                values: [registerDto.nickname]
              }

              const getUser = await this.pool.query(getUserQuery)

              if(getUser.rows.length > 0) {
                throw new HttpException('Nickname already exist', HttpStatus.BAD_REQUEST);
              }

              const password = registerDto.password
              const salt = await bcrypt.genSalt(10)
              const passwordHash = await bcrypt.hash(password, salt)
              const creatingDataQuery = {
                text: `INSERT INTO users(username, email, password, nickname) VALUES($1, $2, $3) RETURNING id`,
                values: [registerDto.username, registerDto.email, passwordHash, registerDto.nickname]
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

              return {
                accessToken,
                refreshToken
              }

            } catch (e) {
                throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }

        async sendMail(sendMail: any){
      try {
        const getUserQuery = {
          text: `SELECT * FROM users WHERE email = $1`,
          values: [sendMail.email]
        }

        const getUser = await this.pool.query(getUserQuery)

        if (getUser.rows.length > 0) {
          throw new HttpException('Verified!', HttpStatus.BAD_REQUEST);
        }

        const data = Math.floor(100000 + Math.random() * 900000)
        const addRedis = await this.redis.set(sendMail.email, data);

        let transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'uabbasov52@gmail.com',
            pass: 'ktbd rdgr ocfq bpwh'
          }
        });

        let mailOptions = {
          from: 'uabbasov52@gmail.com',
          to: sendMail.email,
          subject: 'Sending Email test',
          html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Confirmation</title>
        </head>
        <body style="margin: 20px 0; padding: 0; font-family: Arial, sans-serif; background-color: #111111;">
        <div style="border: 2px solid #24272b; margin: 20px auto; width: 60%; min-height: 400px;">
          <div style="background-color: #111111; border-radius: 10px; padding: 20px; text-align: center;">
           <h1 style="color: #ffffff; margin-top: 0; text-align: left;">Codersbud</h1>
            <div style="text-align: center; width: 80%; margin: 0 auto; min-height: 300px;">
              <h2 style="color: #ffffff;">Your confirmation code</h2>
              <p style="color: #a0a0a0;">You can use it to log into your account.</p>
              <hr style="border: 2px solid #24272b; width: 100%; margin: 20px auto;">
              <h1 style="color: #4363d6;">${data}</h1>
              <hr style="border: 2px solid #24272b; width: 100%; margin: 20px auto;">
              <p style="color: #a0a0a0;">For security reasons, do not send this code to anyone.</p>
              <p style="color: #a0a0a0; margin-bottom: 0;">Sincerely, Codersbud team.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
`
        };

        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
            throw new HttpException({
              massage: `Make sure that you registered from our platform.`,
              solution: 'If you registered from another platform for example from google then you need to login from google also.'
            }, HttpStatus.BAD_REQUEST);
          } else {
            return 'Verification code sent to email'
          }
        });
      } catch (e) {
        console.log(e)
      }
        }

        async verification(data: any){
            try {
  const isCode = await this.redis.get(data.email)
              if(!isCode){
                throw new HttpException(
                  'Something went bad'
                  , HttpStatus.BAD_REQUEST);
              }
      if (isCode === data.code.toString()) {
        const deleteRedis = await this.redis.del(data.email)
        return 0
      } else {
          throw new HttpException(
            'Something went bad'
                , HttpStatus.BAD_REQUEST);
        }
            } catch (e){
                console.log(e)
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
            const newRefreshToken = this.jwtService.sign({sub: user.rows[0].id }, {secret: process.env.REFRESH_SECRET, expiresIn: '60d'})
            return {
                accessToken: newAccessToken,
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
              text: `INSERT INTO users(username, email, avatar) VALUES($1, $2, $3, $4, $5) RETURNING id`,
              values: [given_name + ' ' + family_name , email, picture]
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
                text: `INSERT INTO users(username, email, avatar) VALUES($1, $2, $3, $4, $5) RETURNING id`,
                values: [name, email, avatar_url]
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