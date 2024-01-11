import { SendNotification } from './../dto/sendNotification';
import { GetUserDto } from '../dto/getUser.dto';
import { AddUserDto } from './../dto/addUser.dto';
import { OnModuleInit } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io'
import { OnGatewayConnection } from "@nestjs/websockets";
import { PrismaService } from 'src/prisma/prisma.service';
import groupMessagesByDate from 'src/utils/separateTime';
import { GetMessage } from '../dto/getMessage';



@WebSocketGateway({ cors: { origin: '', methods: ['GET', 'POST'] }})
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    @WebSocketServer()
    server: Server

    constructor(private prismaService: PrismaService) { }
    @SubscribeMessage('join')
    async joining(@ConnectedSocket() client: Socket, @MessageBody() privateId: any){
        try{
            client.join(privateId.toString())
        } catch(e){
            client.emit('join', {error: e})
            console.log(e)
        }
    }
    @SubscribeMessage('addMessage')
    async handleMessega(@ConnectedSocket() client: Socket, @MessageBody() getUser: GetUserDto) {
        try {
        if (getUser.targetType === 'private') {
            const privateId = getUser.targetId
            console.log(privateId)
            const user = await this.prismaService.user.findUnique({
                where: {
                    refreshToken: getUser.refreshToken
                }
            })
            console.log(user)
            const privated = await this.prismaService.private.findUnique({
                where: {
                    uniqueId: privateId
                }
            })
            console.log(privateId)
            const message = await this.prismaService.message.create({
                data: {
                    privateId: privated.id,
                    roomId: null,
                    body: getUser.message,
                    userId: user.id
                }
            })
            console.log(message)
            client.to(privateId.toString()).emit('receiveMessage', { body: `${getUser.message}`, user: user.name, own: 0, time: new Date()})
            console.log("------------")
        } else {
            const roomId = Number(getUser.targetId)
            const user = await this.prismaService.user.findUnique({
                where: {
                    refreshToken: getUser.refreshToken
                }
            })
            const message = await this.prismaService.message.create({
                data: {
                    roomId,
                    privateId: null,
                    body: getUser.message,
                    userId: user.id
                }
            })

            const room = await this.prismaService.room.findUnique({
                where: {
                    id: roomId
                }
            })
            this.server.to(room.name).emit('addMessage', { text: `${getUser.message}`, user: user.name });
        }
    } catch(e){
        client.emit('addMessage', {error: e})
        console.log(e)
    }

}

@SubscribeMessage('sendData')
async sendNotification(@ConnectedSocket() client: Socket, @MessageBody() getUser: GetUserDto){
    try {
        const user = await this.prismaService.user.findUnique({
          where: {
            refreshToken: getUser.refreshToken,
          },
          include: {
            privates: true,
          },
        });

    if (!user) {
        return 'not'
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
        console.log(e)
    }
}
    handleConnection(client: any, ...args: any[]) {
        console.log(client.id)
    }

    handleDisconnect(client: any) {

    }

    onModuleInit() {

    }

}