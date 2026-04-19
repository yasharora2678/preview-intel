import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { Public } from 'src/infrastructure/decorators/public.decorator';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    @InjectQueue('pr-review') private readonly queue: Queue,
  ) {}

  @Get()
  @Public() // health check must be accessible without JWT
  async check() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueue(),
    ]);

    const [db, redis, queue] = checks.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : {
            status: 'down',
            error: (r as PromiseRejectedResult).reason?.message,
          },
    );

    const allHealthy = checks.every((r) => r.status === 'fulfilled');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: { database: db, redis, queue },
    };
  }

  private async checkDatabase() {
    await this.dataSource.query('SELECT 1');
    return { status: 'up' };
  }

  private async checkRedis() {
    // CacheService wraps ioredis — access the ping via its client
    await (this.cacheService as any).redis.ping();
    return { status: 'up' };
  }

  private async checkQueue() {
    const [waiting, active, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getFailedCount(),
    ]);
    return { status: 'up', waiting, active, failed };
  }
}
