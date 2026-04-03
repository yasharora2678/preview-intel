import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PullRequest } from '../pull-request.entity';
import { ReviewIssue } from '../review-issue.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pull_request_id: string;

  @ManyToOne(() => PullRequest)
  @JoinColumn({ name: 'pull_request_id' })
  pullRequest: PullRequest;

  @OneToMany(() => ReviewIssue, (issue) => issue.review)
  issues: ReviewIssue[];

  @Column()
  head_commit_sha: string;

  @Column()
  status: string;

  @Column()
  llm_provider: string;

  @Column()
  llm_model: string;

  @Column({ nullable: true })
  score: number;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ default: false })
  missing_tests: boolean;

  @Column({ default: false })
  breaking_change: boolean;

  @Column({ type: 'bigint', nullable: true })
  github_review_id: number;

  @Column({type: 'timestamptz', nullable: true })
  processing_started_at: Date;

  @Column({type: 'timestamptz', nullable: true })
  processing_completed_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
