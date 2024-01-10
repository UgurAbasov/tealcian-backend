import { CreatePrivateDto } from './dto/createPrivate.dto';
import { CreateRoomDto } from './dto/createRoom.dto';
import { ChatService } from './chat.service';
import { Controller, Post, Body, Get } from '@nestjs/common';
import { GetMessage } from './dto/getMessage';

@Controller('chat')
export class ChatController {
    constructor(private chatService:ChatService){}

    @Post('room')
    createRoom(@Body() createRoom: CreateRoomDto){
        return this.chatService.createRoom(createRoom)
    }

    @Post('private')
    createPrivate(@Body() createPrivate: CreatePrivateDto){
        return this.chatService.createPrivate(createPrivate)
    }

    @Post('getPrivates')
    getUserPrivates(@Body() refreshToken: any){
        return this.chatService.getUserPrivates(refreshToken)
    }

    @Post('getMessages')
    getMessages(@Body() getMessage:GetMessage){
        return this.chatService.getMessages(getMessage)
    }

    @Get('cleanData')
    cleanData(){
        return this.chatService.cleanData()
    }
    @Post('getLastMessages')
    getLastMessages(@Body() getMessage:GetMessage){
        return this.chatService.getLastMessages(getMessage)
    }

}
