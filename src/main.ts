import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { urlencoded } from 'express';
import { ValidationError } from 'class-validator';
import { DtoValidation } from './infrastructure/http/exceptions/exceptions';
import { Logger } from 'nestjs-pino';
import { addTransactionalDataSource, initializeTransactionalContext } from 'typeorm-transactional';
import { DataSource } from 'typeorm';

async function bootstrap() {
  initializeTransactionalContext();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const dataSource = app.get(DataSource);
  addTransactionalDataSource(dataSource);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT');
  app.enableCors();
  app.useLogger(app.get(Logger));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
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
