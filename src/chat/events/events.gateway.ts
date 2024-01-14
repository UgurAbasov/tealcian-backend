import { DeleteMessage } from './../dto/deleteMessage.dto';
import { SendNotification } from '../dto/sendNotification.dto';
import { GetUserDto } from '../dto/getUser.dto';
import { AddUserDto } from './../dto/addUser.dto';
import { OnModuleInit } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io'
import { OnGatewayConnection } from "@nestjs/websockets";
import { PrismaService } from 'src/prisma/prisma.service';
import groupMessagesByDate from 'src/utils/separateTime';
import { GetMessage } from '../dto/getMessage.dto';



@WebSocketGateway({ cors: { origin: 'https://tealcian-frontend.vercel.app', methods: ['GET', 'POST'] }})
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    @WebSocketServer()
    server: Server

    constructor(private prismaService: PrismaService) { }
    @SubscribeMessage('join')
    async joining(@ConnectedSocket() client: Socket, @MessageBody() data: any){
        try{
            client.join(data.privateId.toString())
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

@SubscribeMessage('joinToAll')
async joinToAll(@ConnectedSocket() client: Socket, @MessageBody() getUser: GetUserDto){
    try {
        client.join(getUser.targetId.toString())
} catch (e) {
    return e
    }
}

@SubscribeMessage('sendNotification')
async sendNotification(@ConnectedSocket() client: Socket, @MessageBody() getUser: SendNotification){
    try {
        const user = await this.prismaService.user.findUnique({
            where: {
                refreshToken: getUser.refreshToken
            }
        })
        client.to(getUser.roomId.toString()).emit('sendNotification', { message: getUser.message, userId: user.id, privateId: getUser.roomId })
} catch (e) {

    }
}

@SubscribeMessage('deleteMessage')
async deleteMessage(@ConnectedSocket() client: Socket, @MessageBody() message: DeleteMessage){
    try {
        const getMessage = await this.prismaService.message.findMany({
            where: {
                body: message.message,
                createdAt: message.time,
                privateId: message.privateId,
                userId: message.userId
            }
        })
        if(!getMessage){
            return 'error'
        }
        const deleteMessage = await this.prismaService.message.delete({
            where: {
                id: getMessage[0].id
            }
        })
        const getAllMessage = await this.prismaService.private.findMany({
            where: {
                uniqueId: message.privateId
            },
            include: {
                message: true
            }
        })
        client.to(message.privateId.toString()).emit('deleteMessage', getAllMessage)
    } catch(e) {
        return e.message
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