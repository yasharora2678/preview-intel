import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { ValidationError } from 'class-validator';
import { DtoValidation } from './infrastructure/http/exceptions/exceptions';
import { GithubRawBodyMiddleware } from './infrastructure/http/middleware/github-raw-body-middleware';
import * as express from 'express';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    '/api/v1/webhooks/github',
    express.raw({ type: 'application/json' }),
  );
  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT');
  app.enableCors();
  // app.use(json({ limit: '50mb' }));
  // app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        return new DtoValidation(errors);
      },
    }),
  );
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  await app.listen(port);
}
bootstrap();
