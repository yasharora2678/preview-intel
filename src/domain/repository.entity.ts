import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Installation } from './installation.entity';

@Entity('repositories')
export class Repository {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  installation_id: string;

  @ManyToOne(() => Installation, (inst) => inst.repositories)
  @JoinColumn({ name: 'installation_id' })
  installation: Installation;

  @Column({ type: 'bigint', unique: true })
  github_repo_id: number;

  @Column()
  full_name: string;

  @Column()
  default_branch: string;

  @Column({ default: true })
  is_enabled: boolean;

  @Column({ default: true })
  skip_drafts: boolean;

  @Column({ default: true })
  skip_bots: boolean;

  @Column('text', { array: true, default: '{}', name: 'skip_file_patterns' })
  skip_file_patterns: string[];

  @Column({ default: 50 })
  score_failure_threshold: number;

  @Column({ default: 80 })
  score_success_threshold: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
