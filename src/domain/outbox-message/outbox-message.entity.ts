import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { OutBoxStatus } from './enums/outbox-message.enum';
import { PrReviewJobData } from 'webhook-reciever/src/shared/pre-review-job-data';

@Entity('outbox_message')
export class OutboxMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  event_type: string;

  @Column({ length: 100, unique: true })
  delivery_id: string;

  @Column({ type: 'jsonb' })
  payload: PrReviewJobData;

  @Column({ type: 'enum', enum: OutBoxStatus, default: OutBoxStatus.PENDING })
  status: OutBoxStatus;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  public markAsSent(): void {
    if (this.status === OutBoxStatus.PUBLISHED) {
      throw new Error('Message is already published.');
    }

    this.status = OutBoxStatus.PUBLISHED;
    this.published_at = new Date();
  }

  public markAttempt(): void {
  this.attempts += 1;

  if (this.attempts >= 4) {
    this.status = OutBoxStatus.FAILED;
  } else {
    this.status = OutBoxStatus.PENDING;
  }
}
}
