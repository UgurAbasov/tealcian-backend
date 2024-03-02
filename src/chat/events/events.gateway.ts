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
import { JoinToRoomDto } from "../dto/joinToRoom.dto";
import { SendMessageToRoomDto } from "../dto/sendMessageToRoom.dto";
import { RtGuard } from "../../auth/guards/rt.guard";
// import { RedisService } from '@liaoliaots/nestjs-redis';
@WebSocketGateway()
export class ChatGateway implements OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(@Inject(PG_CONNECTION) private pool: any) {}

    async handleDisconnect(@ConnectedSocket() client: WebSocket) {

    }
    @UseGuards(RtGuard)
    @SubscribeMessage('joinRoom')
    async handleJoinRoom(@ConnectedSocket() client: WebSocket, @MessageBody() joinToRoom: JoinToRoomDto) {
        try {
            if (!client['room']) {
                client['room'] = [];
            }

            if (!client['room'].includes(joinToRoom.roomId)) {
                await this.addClientToRoom(joinToRoom.roomId, client);
                console.log(`Client joined room: ${joinToRoom.roomId}`);
            }
        } catch (e){
            console.log(e)
        }
    }


    @UseGuards(RtGuard)
    @SubscribeMessage('sendMessageToRoom')
    async handleMessage(@ConnectedSocket() client: WebSocket,@Request() req, @MessageBody() sendMessageToRoomDto: SendMessageToRoomDto) {
       try {
           const userId = req.user.id
           let createMessage: object;
           const createMessageQuery = {
               text: `INSERT INTO ${sendMessageToRoomDto.type}_messages(body, createdAT, userId, roomId) VALUES($1,$2,$3,$4)`,
               values: [sendMessageToRoomDto.body, new Date().toISOString().slice(0, 19).replace('T', ' '), userId, sendMessageToRoomDto.roomId]
           }
           createMessage = await this.pool.query(createMessageQuery).rows[0]

           const result = JSON.stringify(createMessage)

           this.server.clients.forEach((ws: WebSocket) => {
               if (ws['room'].includes(sendMessageToRoomDto.roomId)) {
                   ws.send(result);
               }
           });
       } catch (e) {
           console.log(e)
       }

    }

    @UseGuards(RtGuard)
    @SubscribeMessage('allData')
    async sendAllData(@ConnectedSocket() client: WebSocket,  @Request() req, @MessageBody() sendMessageToRoomDto: SendMessageToRoomDto) {
        try {
            const user = req.user.id

            // if(sendMessageToRoomDto){
            //
            // }

            const getPrivatesQuery = {
                text: `
SELECT user_private.privateId, users.first_name, users.last_name, users.avatar, private_messages.body, private_messages.createdAT FROM users
  INNER JOIN user_private ON user_private.userId = users.id
  INNER JOIN private_messages ON private_messages.privateId = user_private.privateId
  WHERE user_private.privateId = (SELECT privateId FROM user_private WHERE userId = $1) 
  ORDER BY private_messages.createdAT DESC
  LIMIT 1;
`,
                values: [user]
            }

            const getPrivates = await this.pool.query(getPrivatesQuery)

            const getRoomsQuery = {
                text: `SELECT room_messages.body, room_messages.createdAT, room.name, room.id FROM room
                   INNER JOIN room_messages ON room_messages.roomId = room.id
                   WHERE room.id = (SELECT roomId FROM user_room WHERE userId = $1)
                   ORDER BY room_messages.createdAT DESC
                   LIMIT 1;
                   `,
                values: [user]
            }

            const getRooms = await this.pool.query(getRoomsQuery)
            const resultArray = getRooms.rows.concat(getPrivates.rows)
            return resultArray.sort((a: any, b: any) => {
                if(new Date(a.createdat) > new Date(b.createdat)) {
                    return -1
                } else if(new Date(a.createdat) > new Date(b.createdat)){
                    return 1
                }
                return 0
            })
        } catch (e) {
            console.log(e)
        }
    }

    private async addClientToRoom(roomId: string, client: WebSocket): Promise<void> {
        if (!client['room'].includes(roomId)) {
            client['room'].push(roomId);
        }
    }

    private async removeClientFromRoom(roomId: string, client: WebSocket): Promise<void> {
        const findData = client['room'].findIndex((item) => item === roomId)
        client['room'].splice(findData,1);
    }

    private async getRoomId(roomId: string,client: WebSocket): Promise<string | undefined> {
        return client['room'][roomId];
    }
}