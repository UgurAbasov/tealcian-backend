import { Module } from "@nestjs/common";
import { ChatGateway } from "./events.gateway";
import { DbModule } from "../../db/db.module";
@Module({
  imports: [DbModule],
    providers: [ChatGateway]
  })
  export class EventsModule {}