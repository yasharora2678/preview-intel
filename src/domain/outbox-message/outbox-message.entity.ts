import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { OutBoxStatus } from './enums/outbox-message.enum';

@Entity('outbox_message')
export class OutboxMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  event_type: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ type: 'enum', enum: OutBoxStatus, default: OutBoxStatus.PENDING })
  status: OutBoxStatus;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  public markAsSent(): void {
    if (this.status === OutBoxStatus.SENT) {
      throw new Error('Message is already marked as sent.');
    }

    this.status = OutBoxStatus.SENT;
    this.published_at = new Date();
  }
}
