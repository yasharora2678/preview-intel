
import { Module } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis'; // ✅ import ioredis module
import { RedisService } from './redis.service';

@Module({
  imports: [NestRedisModule], // ✅ makes the connection token available to RedisService
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}