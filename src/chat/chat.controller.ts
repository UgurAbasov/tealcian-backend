import { CreatePrivateDto } from './dto/createPrivate.dto';
import { CreateRoomDto } from './dto/createRoom.dto';
import { ChatService } from './chat.service';
import { Controller, Post, Body, Get } from '@nestjs/common';

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

    @Get('getPrivates')
    getUserPrivates(@Body() refreshToken: any){
        return this.chatService.getUserPrivates(refreshToken)
    }
}
