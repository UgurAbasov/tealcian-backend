import { ChatModule } from './chat/chat.module';
import { EventsModule } from './chat/events/events.module';
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
@Module({
  imports: [AuthModule, PrismaModule, EventsModule, AuthModule, ChatModule],
})
export class AppModule {}
