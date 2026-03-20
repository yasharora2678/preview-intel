import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('outbox_message')
export class OutboxMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  event_type: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column()
  status: string;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
