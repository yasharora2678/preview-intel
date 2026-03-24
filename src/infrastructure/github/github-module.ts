import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { GithubClientService } from './github-client-service';

@Module({
  imports: [RedisModule],
  providers: [GithubClientService],
  exports: [GithubClientService],
})
export class GithubModule {}