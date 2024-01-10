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
import groupMessagesByDate from 'src/utils/separateTime';
import { GetMessage } from './dto/getMessage';

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
                refreshToken: refreshToken.refreshToken,
              },
              include: {
                privates: true,
              },
            });

        if (!user) {
              throw new HttpException(`Something went wrong`, HttpStatus.INTERNAL_SERVER_ERROR);
            }

            const objectArr = [];
            let privateId = []
            for (let i = 0; i < user.privates.length; i++) {
              const userPrivateRecords = await this.prismaService.userPrivate.findMany({
                where: {
                  privateId: user.privates[i].privateId,
                },
              });
              privateId.push(user.privates[i].privateId)
              for (let j = 0; j < userPrivateRecords.length; j++) {
                const findUser = await this.prismaService.user.findUnique({
                  where: {
                    id: userPrivateRecords[j].userId,
                  },
                });

                const findPrivate = await this.prismaService.private.findUnique({
                    where: {
                        id: user.privates[i].privateId
                    }
                })
          
                if (findUser && findUser.id !== user.id) {
                    objectArr.push({user: findUser.name, privateId: findPrivate.uniqueId});
                }
              }
            }
            return {
                objectArr
            }
          } catch (e) {
            throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
          }
    }

    async getMessages(getMessage:GetMessage){
        try {
            const room = await this.prismaService.private.findUnique({
                where: {
                    uniqueId: getMessage.roomId
                },
                include: {
                    message: {
                        select: {
                            body: true,
                            createdAt: true,
                            userId: true
                        }
                    }
                }
            })
    
            const getRequestUser = await this.prismaService.user.findUnique({
                where: {
                    refreshToken: getMessage.refreshToken
                }
            })
    
            const arr = []
            for(let i = 0; i < room.message.length; i++){
                const getUser = await this.prismaService.user.findUnique({
                    where: {
                        id: room.message[i].userId
                    }
                })
                arr.push({
                    body: room.message[i].body,
                    time: room.message[i].createdAt,
                    userName: getUser.name,
                    own: getUser.id === getRequestUser.id ? 0 : 1
                })
            }
                return groupMessagesByDate(arr)
        } catch(e){
            throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async cleanData(){
        try{
        const deletedMessages = await this.prismaService.message.deleteMany({
            where: {},
          });
        } catch(e) {
            console.log(e)
        }
    }

    async getLastMessages(getMessage:GetMessage){
        try {
            const user = await this.prismaService.user.findUnique({
                where: {
                  refreshToken: getMessage.refreshToken,
                },
                include: {
                  privates: true,
                },
              });
              const usersPrivates = []
              for(let i = 0; i < user.privates.length; i++){
                const findPrivate = await this.prismaService.private.findMany({
                    where: {
                        id: user.privates[i].privateId
                    },
                    select: {
                        message: true
                    }
                })
                for(let j = 0; j < findPrivate.length;j++){
                    const lastMassage = findPrivate[j].message
                    if(lastMassage[lastMassage.length - 1] !== null){
                        usersPrivates.push(lastMassage[lastMassage.length - 1])
                    }
                }
              }
              return usersPrivates
        } catch(e){
            throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

