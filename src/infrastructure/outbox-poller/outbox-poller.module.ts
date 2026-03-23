import { Module } from '@nestjs/common';
import { OutboxMessageRepository } from 'src/infrastructure/repositories/outbox-message.repository';
import { OutboxPollerService } from './outbox-poller.service';
import { QueueModule } from 'src/features/queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [OutboxPollerService, OutboxMessageRepository],
})
export class OutboxPollerModule {}
