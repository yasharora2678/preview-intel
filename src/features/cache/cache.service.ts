import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis(configService.get<string>('REDIS_URL')!, {
      keyPrefix: 'cache:',
      lazyConnect: true,
      enableReadyCheck: true,
    });

    this.redis.on('error', (err) => {
      this.logger.error({ msg: 'Redis cache error', err: err.message });
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (err) {
      this.logger.error({ msg: 'Cache get failed', key, err });
      return null; // Graceful degradation — cache miss is never fatal
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = this.DEFAULT_TTL): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      this.logger.error({ msg: 'Cache set failed', key, err });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.error({ msg: 'Cache del failed', key, err });
    }
  }

  // Invalidate all cache keys matching a prefix pattern
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Use SCAN instead of KEYS — never block Redis in production
      const stream = this.redis.scanStream({
        match: `${pattern}*`,
        count: 100,
      });

      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      });
    } catch (err) {
      this.logger.error({ msg: 'Cache invalidate failed', pattern, err });
    }
  }

  // Cache key builders — centralized so they never drift
  keys = {
    repoReviews: (repoId: string, page: number, limit: number) =>
      `repo:${repoId}:reviews:${page}:${limit}`,
    reviewDetail: (reviewId: string) => `review:${reviewId}`,
    scoreTrend: (repoId: string, period: string) =>
      `repo:${repoId}:score-trend:${period}`,
    issueDistribution: (repoId: string) =>
      `repo:${repoId}:issue-distribution`,
    authorStats: (repoId: string) =>
      `repo:${repoId}:author-stats`,
    repoSummary: (repoId: string) =>
      `repo:${repoId}:summary`,
  };
}