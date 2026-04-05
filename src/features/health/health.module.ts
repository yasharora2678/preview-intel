import { QueueModule } from 'src/infrastructure/queue/queue.module';
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  imports: [QueueModule],
  controllers: [HealthController],
})
export class HealthModule {}