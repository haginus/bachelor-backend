import './load-env';
import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    exposedHeaders: ['Content-Disposition'],
  });
  app.set('query parser', 'extended');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
