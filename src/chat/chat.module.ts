import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module";

@Module({
    imports: [DbModule],
    providers: [ChatService],
    controllers: [ChatController]
})

export class ChatModule {}