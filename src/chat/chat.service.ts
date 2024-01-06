import { CreateRoomDto } from './dto/createRoom.dto';
import { Injectable } from '@nestjs/common';
import { GetUserDto } from './dto/getUser.dto';
import { AddUserDto } from './dto/addUser.dto';
import { PrismaService } from './../prisma/prisma.service';
import { HttpException } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { CreatePrivateDto } from './dto/createPrivate.dto';
import { Prisma } from '@prisma/client';
import simpleHash from 'src/utils/hash';

@Injectable()
export class ChatService {
    constructor(private prismaService: PrismaService) { }
    async createRoom(createRoom: CreateRoomDto) {
        try {
            // find owner
            const owner = await this.prismaService.user.findUnique({
                where: {
                    refreshToken: createRoom.refreshToken
                }
            })
            if (!owner) {
                throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            const unknowsUsers = []
            const users = [owner.id]
            for(let i = 0; i < createRoom.users.length; i++){
                const searchingUsers = await this.prismaService.user.findUnique({
                    where: {
                        email: createRoom.users[i]
                    }
                })
                if(!searchingUsers){
                    unknowsUsers.push(createRoom.users[i])
                } else {
                    users.push(searchingUsers.id)
                }
            }
            if(unknowsUsers.length > 0){
                const splitUsers = unknowsUsers.join(', ')
                throw new HttpException(`We don't know about these users: ${splitUsers}`, HttpStatus.INTERNAL_SERVER_ERROR);
            }
            // create room schema
            const ownerId = owner.id
            const room = await this.prismaService.room.create({
                data: {
                    name: createRoom.name,
                    type: 'room',
                    ownerId,
                    uniqueId: simpleHash(createRoom.users)
                }
            })

            // take users
            for (let i = 1; i <= users.length; i++) {
                const rooming = await this.prismaService.userRoom.create({
                    data: {
                        userId: users[i],
                        roomId: room.id
                    }
                })
            }
            return {
                result: 'goood'
            }
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                throw new HttpException('You already have chat with this user', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async createPrivate(createPrivate: CreatePrivateDto) {
        try {
            const user = await this.prismaService.user.findUnique({
                where: {
                    refreshToken: createPrivate.refreshToken
                }
            })
            if (!user) {
                throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            const searchingUser = await this.prismaService.user.findUnique({
                where: {
                    email: createPrivate.userEmail
                }
            })
            if (!searchingUser) {
                throw new Error(`We don't know about this user`)
            }

            const arrayofEmail = [searchingUser.email, user.email]
            const privated = await this.prismaService.private.create({
                data: {
                uniqueId: simpleHash(arrayofEmail),
                  name: createPrivate.userEmail,
                  type: 'private',
                },
              });


              const arrayOfId = [searchingUser.id, user.id]
             for (let i = 1; i <= 2; i++) {
              const privating = await this.prismaService.userPrivate.create({
                data: {
                    userId: arrayOfId[i-1],
                    privateId: privated.id
                }
              });
            }
            
            return {
                result: 'success',
            }
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                throw new HttpException('You already have chat with this user', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getUserPrivates(refreshToken: any){
        try {
            const user = await this.prismaService.user.findUnique({
                where: {
                    refreshToken: refreshToken.refreshToken
                },
                include: {
                    privates: true
                }
            })
            if (!user) {
                throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            
            const resultArr = []
            for(let i = 0; i < user.privates.length; i++){
           const userPrivateRecords = await this.prismaService.userPrivate.findMany({
                where: {
                  privateId: user.privates[i].privateId,
                },
              }); 

              const findUser =  await this.prismaService.user.findUnique({
                where: {
                    id: userPrivateRecords[i].userId
                }
              })

              if(findUser === user){
                i--
              } else {
              if(findUser){
                resultArr.push(findUser)
              }
            }
            }
            return resultArr
        } catch (e) {
            throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

