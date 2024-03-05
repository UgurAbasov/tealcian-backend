import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody
} from "@nestjs/websockets";
import { Server, WebSocket } from 'ws';
import { Inject, Request, UseGuards } from "@nestjs/common";
import { PG_CONNECTION } from "../../constants";
import { SendMessageToRoomDto } from "../dto/sendMessageToRoom.dto";
import { InjectRedis, DEFAULT_REDIS_NAMESPACE } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis'
import {sha256} from 'js-sha256'
@WebSocketGateway()
export class ChatGateway implements OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(@Inject(PG_CONNECTION) private pool: any) {}

    handleDisconnect(@ConnectedSocket() client: WebSocket) {
        if(this.removeClientFromRoom(client)){
            console.log('Sucesefully removed')
        }
    }


    @SubscribeMessage('joinRoom')
    async handleJoinRoom(@ConnectedSocket() client: WebSocket, @MessageBody() joinToRoom: any) {
        try {
            if (!client['room']) {
                client['room'] = [];
            }


            if (!client['room'].includes(joinToRoom)) {


                await this.addClientToRoom(joinToRoom, client);
            } else {
                console.log('You are already in this room')
            }
        } catch (e){
            if(e.message.includes('uuid')){
                console.log('Something went wrong')
            }
            console.log(e.message)
        }
    }


    @SubscribeMessage('sendMessageToRoom')
    async handleMessage(@ConnectedSocket() client: WebSocket, @Request() req, @MessageBody() sendMessageToRoomDto: SendMessageToRoomDto) {
       try {
           // if(!this.getRoomId(client)) {
           //     client.close()
           // }


           const userQuery = {
               text: `SELECT * FROM users WHERE refreshToken = $1`,
               values: [sendMessageToRoomDto.refreshToken]
           }

           const user = await this.pool.query(userQuery)

           if(user.rows.length === 0){
               client.close()
           }

           const checkRoomQuery = {
               text: `SELECT * FROM room, private WHERE room.id = $1 OR private.id = $1`,
               values: [sendMessageToRoomDto.roomId]
           }

           const checkRoom = await this.pool.query(checkRoomQuery)
           if(checkRoom.rows.length === 0){
               client.close()
           }

           let createMessage: any;
           const createMessageQuery = {
               text: `INSERT INTO ${sendMessageToRoomDto.type}_messages(body, createdAT, userId, roomId) VALUES($1,$2,$3,$4) RETURNING *`,
               values: [sendMessageToRoomDto.body, new Date().toISOString().slice(0, 19).replace('T', ' '), user.rows[0].id, sendMessageToRoomDto.roomId]
           }
           createMessage = await this.pool.query(createMessageQuery)
           const result = JSON.stringify(createMessage.rows[0])
           const secure = sha256.hmac(result,'secret')
           const buffer = new TextEncoder().encode(JSON.stringify(secure))
           this.server.clients.forEach((ws: WebSocket) => {
                   if (ws['room'].includes(sendMessageToRoomDto.roomId)) {
                       ws.send(buffer);
                   }
           })
       } catch (e) {
           console.log(e.message)
       }
    }


    private async addClientToRoom(roomId: string, client: WebSocket): Promise<void> {
        if (!client['room'].includes(roomId)) {
            client['room'].push(roomId);
        }
    }

    private removeClientFromRoom(client: WebSocket) {
        return delete client['room']
    }

    private async getRoomId(client: WebSocket): Promise<string | undefined> {
        return client['room'];
    }
}