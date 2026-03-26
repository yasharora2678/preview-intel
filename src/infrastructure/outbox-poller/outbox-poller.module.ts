import { Module } from '@nestjs/common';
import { OutboxPollerService } from './outbox-poller.service';
import { QueueModule } from 'src/features/queue/queue.module';
import { OutboxMessageRepository } from '../repositories/outbox-message.repository';

@Module({
  imports: [QueueModule],
  providers: [OutboxPollerService, OutboxMessageRepository],
})
export class OutboxPollerModule {}
