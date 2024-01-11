import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.enableCors({
  //   origin: 'https://tealcian-frontend.vercel.app',
  //   credentials: true
  // })
  await app.listen(process.env.PORT || '0.0.0.0');
}
bootstrap();
