import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '@/app.module';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (
    isProduction &&
    (!process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32 ||
      process.env.JWT_SECRET.includes('change-me'))
  ) {
    throw new Error('JWT_SECRET must be a strong random secret in production');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(cookieParser());
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useBodyParser('json', { limit: '15mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
}
bootstrap();
