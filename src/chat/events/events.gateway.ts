import { DeleteMessage } from './../dto/deleteMessage.dto';
import { SendNotification } from '../dto/sendNotification.dto';
import { GetUserDto } from '../dto/getUser.dto';
import { OnModuleInit } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io'
import { OnGatewayConnection } from "@nestjs/websockets";
import { PrismaService } from 'src/prisma/prisma.service';
import groupMessagesByDate from 'src/utils/separateTime';

@WebSocketGateway({
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }})
  export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    @WebSocketServer()
    server: Server

    constructor(private prismaService: PrismaService) {}
    @SubscribeMessage('join')
    async joining(@ConnectedSocket() client: Socket, @MessageBody() data: any){
        try{
            client.join(data.privateId.toString())
            console.log(client.id)
        } catch(e){
            client.emit('join', {error: e})
            console.log(e)
        }

    }
    @SubscribeMessage('addMessage')
    async handleMessega(@ConnectedSocket() client: Socket, @MessageBody() getUser: any) {
        try {
            let Data = new TextDecoder().decode(getUser);
            let result = JSON.parse(Data)
        if (result.targetType === 'private') {
            const privateId = result.targetId
            const user = await this.prismaService.user.findUnique({
                where: {
                    refreshToken: result.refreshToken
                }
            })
            const privated = await this.prismaService.private.findUnique({
                where: {
                    uniqueId: privateId
                }
            })
            const message = await this.prismaService.message.create({
                data: {
                    privateId: privated.id,
                    roomId: null,
                    body: result.message,
                    userId: user.id
                }
            })
            const resultObj = {
                body: `${result.message}`,
                user: user.name,
                own: user.id,
                time: message.createdAt.toString(),
            } 

            var buffer = new TextEncoder().encode(JSON.stringify(resultObj));
            console.log(buffer,2)
        
            client.nsp.to(client.id).emit('receiveMessage', buffer)
            client.to(privateId.toString()).emit('receiveMessage', buffer)
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
async joinToAll(@ConnectedSocket() client: Socket, @MessageBody() getUser: any){
    try {
        let Data = new TextDecoder().decode(getUser);
        let result = JSON.parse(Data)
        client.join(result.targetId.toString())
        client.join(client.id)
} catch (e) {
    return e
    }
}

@SubscribeMessage('sendNotification')
async sendNotification(@ConnectedSocket() client: Socket, @MessageBody() getUser: any){
    try {
        let Data = new TextDecoder().decode(getUser);
        let result = JSON.parse(Data)
        const user = await this.prismaService.user.findUnique({
            where: {
                refreshToken: result.refreshToken
            }
        })
        const resultObj = { message: result.message, userId: user.id, privateId: result.roomId }
        var buffer = new TextEncoder().encode(JSON.stringify(resultObj));
        client.to(result.roomId.toString()).emit('sendNotification', buffer)
} catch (e) {

    }
}

@SubscribeMessage('deleteMessage')
async deleteMessage(@ConnectedSocket() client: Socket, @MessageBody() message: DeleteMessage){
    try {
        console.log(message, 4)
        const getPrivate = await this.prismaService.private.findUnique({
            where: {
                uniqueId: message.privateId
            }
        })
        console.log(getPrivate, 1)
        const getMessage = await this.prismaService.message.findMany({
            where: {
                body: message.message,
                createdAt: message.time,
                privateId: getPrivate.id,
             }
        })
        if(!getMessage){
            return 'error'
        }
        console.log(getMessage,2)
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

        const arr = []
        for(let i = 0; i < getAllMessage[0].message.length; i++){
            const getUser = await this.prismaService.user.findUnique({
                where: {
                    id: getAllMessage[0].message[i].userId
                }
            })
            arr.push({
                body: getAllMessage[0].message[i].body,
                time: getAllMessage[0].message[i].createdAt,
                userName: getUser.name,
                own: getUser.id
            })
        }
        const resultObj = {
            arrayResult: groupMessagesByDate(arr)
        }
        var buffer = new TextEncoder().encode(JSON.stringify(resultObj));
        client.nsp.to(client.id).emit('deleteMessage', buffer)
        client.to(message.privateId.toString()).emit('deleteMessage', buffer)
    } catch(e) {
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