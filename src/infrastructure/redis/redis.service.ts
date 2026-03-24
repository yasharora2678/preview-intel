import { InjectRedis } from '@nestjs-modules/ioredis'
import { Injectable } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService {
//   private client: Redis

  constructor(
        @InjectRedis() private readonly redis: Redis,
  ) {
    // this.client = new Redis({
    //   host: process.env.REDIS_HOST,
    //   port: Number(process.env.REDIS_PORT),
    // })
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.redis.set(key, value, 'EX', ttlSeconds)
    } else {
      await this.redis.set(key, value)
    }
  }

  async del(key: string) {
    await this.redis.del(key)
  }
}