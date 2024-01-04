import { CreateRoomDto } from './dto/createRoom.dto';
import { Injectable } from '@nestjs/common';
import { GetUserDto } from './dto/getUser.dto';
import { AddUserDto } from './dto/addUser.dto';
import { PrismaService } from './../prisma/prisma.service';
import { HttpException } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { CreatePrivateDto } from './dto/createPrivate.dto';
@Injectable()
export class ChatService {
    constructor(private prismaService: PrismaService) { }
    async createRoom(createRoom: CreateRoomDto) {
        try {
            // check room
            const findRoom = await this.prismaService.room.findUnique({
                where: {
                    name: createRoom.name
                }
            })
            if (findRoom) {
                throw new HttpException('This room was already used', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            // find owner
            const owner = await this.prismaService.user.findUnique({
                where: {
                    refreshToken: createRoom.refreshToken
                }
            })
            if (!owner) {
                throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            // create room schema
            const ownerId = owner.id
            const room = await this.prismaService.room.create({
                data: {
                    name: createRoom.name,
                    type: 'room',
                    ownerId
                }
            })
            // search room
            const serchingRoom = await this.prismaService.room.findUnique({
                where: {
                    name: createRoom.name
                }
            })
            // take users
            const usersArr = createRoom.users
            for (let i = 1; i <= usersArr.length; i++) {
                const user = await this.prismaService.user.update({
                    where: {
                        email: usersArr[i - 1]
                    },
                    data: {
                        roomId: serchingRoom.id,
                        privateId: null
                    }
                })
                if (!user) {
                    throw new Error(`We don't know about this user`)
                }

            }
            return {
                mess: 'goood'
            }
        } catch (e) {
            throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
            console.log(`error: ${e}`)
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
                throw new HttpException('something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            const searchingUser = await this.prismaService.user.findUnique({
                where: {
                    email: createPrivate.userEmail
                }
            })
            if (!searchingUser) {
                throw new Error(`We don't know about this user`)
            }
            const privated = await this.prismaService.private.create({
                data: {
                    name: createPrivate.userEmail,
                    type: 'private'
                }
            })
            const array = [searchingUser.email, user.email]
            for (let i = 1; i <= 2; i++) {
                const userAdd = this.prismaService.user.update({
                    where: {
                        email: array[i-1]
                    },
                    data:{
                        privateId: privated.id,
                        roomId: null
                    }
                })
            }
        } catch (e) {
            throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

