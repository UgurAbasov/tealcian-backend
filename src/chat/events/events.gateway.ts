import { GetUserDto } from '../dto/getUser.dto';
import { AddUserDto } from './../dto/addUser.dto';
import { OnModuleInit } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io'
import { OnGatewayConnection } from "@nestjs/websockets";
import { PrismaService } from 'src/prisma/prisma.service';


@WebSocketGateway({ cors: { origin: 'https://tealcian-frontend.vercel.app', methods: ['GET', 'POST'] } })
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {

    @WebSocketServer()
    server: Server

    constructor(private prismaService: PrismaService) { }

    @SubscribeMessage('join')
    async handleEvent(@ConnectedSocket() client: Socket, @MessageBody() addUser: AddUserDto) {
       try {
        console.log(addUser.roomId)
        const room = await this.prismaService.private.findUnique({
            where: {
                uniqueId: addUser.roomId
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

        const arr = []
        for(let i = 0; i < room.message.length; i++){
            const getUser = await this.prismaService.private.findUnique({
                where: {
                    id: room.message[i].userId
                }
            })
            arr.push({
                body: room.message[i].body,
                createdAt: room.message[i].createdAt,
                userName: getUser.name
            })
        }

            client.join(addUser.roomId.toString())
            client.emit('join', arr)
    } catch(e){
        client.emit('join', { error: e.message })
    }
    }

    @SubscribeMessage('addMessage')
    async handleMessega(@ConnectedSocket() client: Socket, @MessageBody() getUser: GetUserDto) {
        try {
        if (getUser.targetType === 'private') {
            const privateId = Number(getUser.targetId)
            const user = await this.prismaService.user.findUnique({
                where: {
                    email: getUser.userEmail
                }
            })
            const message = await this.prismaService.message.create({
                data: {
                    privateId,
                    roomId: null,
                    body: getUser.message,
                    userId: user.id
                }
            })
            const privated = await this.prismaService.private.findUnique({
                where: {
                    id: privateId
                }
            })
            this.server.to(privated.name).emit('addMessage', { text: `${getUser.message}`, user: user.name });
        } else {
            const roomId = Number(getUser.targetId)
            const user = await this.prismaService.user.findUnique({
                where: {
                    email: getUser.userEmail
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

    handleConnection(client: any, ...args: any[]) {
        console.log(client.id)
    }

    handleDisconnect(client: any) {

    }

    onModuleInit() {

    }

}