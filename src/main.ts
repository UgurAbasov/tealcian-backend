import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from "@nestjs/platform-ws";
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.enableCors({
  //   origin: `${process.env.FRONTEND_URL}`,
  //   credentials: true
  // })
  app.useWebSocketAdapter(new WsAdapter(app))
  await app.listen(process.env.PORT || '0.0.0.0');
}
bootstrap();
