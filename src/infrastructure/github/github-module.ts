import { Module } from '@nestjs/common';
import { GithubClientService } from './github-client-service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisService } from '../redis/redis.service';
// import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [GithubClientService, RedisService],
  exports: [GithubClientService],
})

export class GithubModule {}