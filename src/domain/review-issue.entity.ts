import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Review } from './review.entity';

@Entity('review_issues')
export class ReviewIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  review_id: string;

  @ManyToOne(() => Review)
  @JoinColumn({ name: 'review_id' })
  review: Review;

  @Column()
  type: string;

  @Column()
  severity: string;

  @Column({ type: 'text' })
  file_path: string;

  @Column({ nullable: true })
  line_number: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  suggestion: string;

  @Column({ type: 'bigint', nullable: true })
  github_comment_id: number;
}
