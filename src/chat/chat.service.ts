import { CreateRoomDto } from './dto/createRoom.dto';
import { Inject, Injectable, Request } from "@nestjs/common";
import { HttpException } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { CreatePrivateDto } from './dto/createPrivate.dto';
import { GetMessage } from './dto/getMessage.dto';
import { PG_CONNECTION } from "../constants";
import { AddUserToRoom,} from "./dto/addUserToRoom.dto";

@Injectable()
export class ChatService {
  constructor(@Inject(PG_CONNECTION) private pool: any) {}
  async createRoom(createRoom: CreateRoomDto, req) {
    try {
      // find owner
      const user = req.user.id

      // create room
      const createRoomQuery = {
        text: `INSERT INTO room(createdAT, ownerId, name) VALUES($1,$2,$3) RETURNING id`,
        values: [new Date().toISOString().slice(0, 19).replace('T', ' '), user, createRoom.name]
      }

      const creatingRoom = await this.pool.query(createRoomQuery)


      const addOwnerToRoomQuery = {
        text: `INSERT INTO user_room(userId, roomId) VALUES($1,$2)`,
        values: [user, creatingRoom.rows[0].id]
      }

      const addOwnerToRoom = await this.pool.query(addOwnerToRoomQuery)

      return 0
        } catch (e) {
            throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async addUsersToRoom(addUserToRoom: AddUserToRoom){
    try {

      const areUsersQuery = {
        text: `SELECT COUNT(*)
      FROM users
      WHERE nickname IN ($1)` ,
        values: addUserToRoom.users
      }

      const areUsers = await this.pool.query(areUsersQuery)

      if(areUsers.rows.length < addUserToRoom.users.length){
        throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      let usersData = addUserToRoom.users
      for (let i = 0; i < usersData.length; i++) {
        if (i % 2 === 0) {
          usersData.splice(i, 0, addUserToRoom.roomId)
        }
      }

      const addUserToRoomQuery = {
        text: `INSERT INTO user_room(roomId, userId) VALUES($1,$2)`,
        values: usersData
      }

      const addUsersToRoom = await this.pool.query(addUserToRoomQuery)
      return 0
    } catch (e){
      throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

    async createPrivate(createPrivate: CreatePrivateDto, req) {
        try {
          const user = req.user.id

          const isUserQuery = {
            text: `SELECT *
            FROM users
            WHERE nickname = $1` ,
            values: [createPrivate.nickname]
          }

          const isUser = await this.pool.query(isUserQuery)

          if(isUser.rows.length < 1) {
            throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
          }

          const createRoomQuery = {
            text: `INSERT INTO private(createdAT) VALUES($1) RETURNING id`,
            values: [new Date().toISOString().slice(0, 19).replace('T', ' ')]
          }

          const creatingRoom = await this.pool.query(createRoomQuery)

          const roomId = creatingRoom.rows[0].id
          const addUsersQuery = {
            text: `INSERT INTO private_room(userId, roomId) VALUES($1,$2)`,
            values: [user, roomId, isUser.rows[0].id, roomId]
          }

          const addUsers = await this.pool.query(addUsersQuery)
          return 0

        } catch (e) {
            throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getRooms(req){
        try {
          const user = req.user.id

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
            throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
          }
    }

    async getMessages(getMessage:GetMessage){
        // try {
        //     const room = await this.prismaService.private.findUnique({
        //         where: {
        //             uniqueId: getMessage.roomId
        //         },
        //         include: {
        //             message: {
        //                 select: {
        //                     body: true,
        //                     createdAt: true,
        //                     userId: true
        //                 }
        //             }
        //         }
        //     })
        //
        //     const getRequestUser = await this.prismaService.user.findUnique({
        //         where: {
        //             refreshToken: getMessage.refreshToken
        //         }
        //     })
        //
        //     const arr = []
        //     for(let i = 0; i < room.message.length; i++){
        //         const getUser = await this.prismaService.user.findUnique({
        //             where: {
        //                 id: room.message[i].userId
        //             }
        //         })
        //         arr.push({
        //             body: room.message[i].body,
        //             time: room.message[i].createdAt,
        //             userName: getUser.name,
        //             own: getUser.id
        //         })
        //     }
        //     const originalData = JSON.stringify(groupMessagesByDate(arr));
        //     const algorithm = 'aes-256-cbc';
        //      const cipher = createCipher(algorithm, 'themost');
        //      let encrypted = cipher.update(originalData, 'utf8', 'hex');
        //     encrypted += cipher.final('hex');
        //     return {
        //         objectArr: encrypted
        //     }
        // } catch(e) {
        //     throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
        // }
    }

    async cleanData(){
    //     try{
    //     const deletedMessages = await this.prismaService.message.deleteMany({
    //         where: {},
    //       });
    //     } catch(e) {
    //         console.log(e)
    //     }
    // }
    //
    // async getLastMessages(getMessage:GetMessage){
    //     try {
    //         const user = await this.prismaService.user.findUnique({
    //             where: {
    //               refreshToken: getMessage.refreshToken,
    //             },
    //             include: {
    //               privates: true,
    //             },
    //           });
    //           console.log(user)
    //           const usersPrivates = []
    //           for(let i = 0; i < user.privates.length; i++){
    //             const findPrivate = await this.prismaService.private.findMany({
    //                 where: {
    //                     id: user.privates[i].privateId
    //                 },
    //                 select: {
    //                     message: true
    //                 }
    //             })
    //             console.log(findPrivate)
    //             for(let j = 0; j < findPrivate.length;j++){
    //                 const lastMassage = findPrivate[j].message
    //                 console.log(lastMassage)
    //                     usersPrivates.push(lastMassage[lastMassage.length - 1].body)
    //             }
    //           }
    //
    //           return usersPrivates
    //     } catch(e){
    //         throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
    //     }
    }
}

