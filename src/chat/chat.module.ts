import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Module } from "@nestjs/common";

@Module({
    providers: [ChatService],
    controllers: [ChatController]
})

export class ChatModule {}