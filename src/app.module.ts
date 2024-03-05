import { ChatModule } from './chat/chat.module';
import { EventsModule } from './chat/events/events.module';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from "@nestjs/common";
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PG_CONNECTION } from "./constants";
import { DbModule } from './db/db.module';
import { RedisModule } from "@liaoliaots/nestjs-redis";


@Module(
  {
  imports: [CacheModule.register({isGlobal: true}), AuthModule, EventsModule, AuthModule, ChatModule, ConfigModule.forRoot(), DbModule],
  providers: [],
  exports: []
})
export class AppModule {}
