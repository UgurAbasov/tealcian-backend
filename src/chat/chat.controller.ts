import { CreatePrivateDto } from './dto/createPrivate.dto';
import { CreateRoomDto } from './dto/createRoom.dto';
import { ChatService } from './chat.service';
import { Controller, Post, Body, Get, Request, UseGuards } from "@nestjs/common";
import { GetMessage } from './dto/getMessage.dto';
import { AddUserToRoom } from "./dto/addUserToRoom.dto";
import { RtGuard } from "../auth/guards/rt.guard";
@Controller('chat')
export class ChatController {
    constructor(private chatService:ChatService){}

    @UseGuards(RtGuard)
    @Post('room')
    createRoom(@Body() createRoom: CreateRoomDto, @Request() req){
        return this.chatService.createRoom(createRoom, req)
    }

    @Post('private')
    createPrivate(@Body() createPrivate: CreatePrivateDto, @Request() req){
        return this.chatService.createPrivate(createPrivate, req)
    }

    @UseGuards(RtGuard)
    @Get('getAll')
    getUserPrivates(@Request() req){
        return this.chatService.getRooms(req)
    }

    // @Post('getMessages')
    // getMessages(@Body() roomId:string, @Request() req){
    //     return this.chatService.getMessages(roomId, req)
    // }

    @UseGuards(RtGuard)
    @Post('addsUsers')
    addUsers(@Body() addUserToRoom:AddUserToRoom){
        return this.chatService.addUsersToRoom(addUserToRoom)
    }

    @Get('cleanData')
    cleanData(){
        return this.chatService.cleanData()
    }
}
