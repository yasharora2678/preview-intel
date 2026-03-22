import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { GithubRawBodyMiddleware } from './infrastructure/http/middleware/github-raw-body-middleware';
import { WebhooksModule } from './features/webhooks/webhooks.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, WebhooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule  {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer.apply(GithubRawBodyMiddleware).forRoutes({
  //     path: '/v1/webhooks/github',
  //     method: RequestMethod.POST,
  //   });
  // }
}
