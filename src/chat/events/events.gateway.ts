import { customParser } from 'socket.io-json-parser';
import { DeleteMessage } from './../dto/deleteMessage.dto';
import { SendNotification } from '../dto/sendNotification.dto';
import { GetUserDto } from '../dto/getUser.dto';
import { OnModuleInit } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io'
import { OnGatewayConnection } from "@nestjs/websockets";
import { PrismaService } from 'src/prisma/prisma.service';
import groupMessagesByDate from 'src/utils/separateTime';



@WebSocketGateway({ cors: { origin: 'https://tealcian-frontend.vercel.app', methods: ['GET', 'POST'] }, parser: customParser})
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    @WebSocketServer()
    server: Server

    constructor(private prismaService: PrismaService) { }
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
    async handleMessega(@ConnectedSocket() client: Socket, @MessageBody() getUser: GetUserDto) {
        try {
        if (getUser.targetType === 'private') {
            const privateId = getUser.targetId
            const user = await this.prismaService.user.findUnique({
                where: {
                    refreshToken: getUser.refreshToken
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
                    body: getUser.message,
                    userId: user.id
                }
            })
            const resultObj = {
                body: `${getUser.message}`,
                user: user.name,
                own: user.id,
                time: message.createdAt,
            }
            // const binaryData = Buffer.from(resultObj, 'utf-8');
            client.nsp.to(client.id).emit('receiveMessage', JSON.stringify(resultObj))
            client.to(privateId.toString()).emit('receiveMessage', JSON.stringify(resultObj))
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
        client.join(client.id)
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
        const resultObj = { message: getUser.message, userId: user.id, privateId: getUser.roomId }
        const binaryData = Buffer.from(JSON.stringify(resultObj), 'utf-8');
        client.to(getUser.roomId.toString()).emit('sendNotification', binaryData)
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
        const binaryData = Buffer.from(JSON.stringify(resultObj), 'utf-8');
        client.nsp.to(client.id).emit('deleteMessage', binaryData)
        client.to(message.privateId.toString()).emit('deleteMessage', binaryData)
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