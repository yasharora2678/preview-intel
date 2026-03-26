import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Repository } from './repository.entity';

@Entity('pull_requests')
export class PullRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  repository_id: string;

  @ManyToOne(() => Repository)
  @JoinColumn({ name: 'repository_id' })
  repository: Repository;

  @Column()
  github_pr_number: number;

  @Column({ type: 'text' })
  title: string;

  @Column()
  author_login: string;

  @Column()
  head_commit_sha: string;

  @Column()
  base_branch: string;

  @Column()
  head_branch: string;

  @Column({ type: 'text' })
  github_pr_url: string;

  @Column()
  state: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
