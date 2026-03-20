import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Repository } from './repository.entity';

@Entity('installations')
export class Installation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  github_installation_id: number;

  @Column()
  github_account_login: string;

  @Column()
  github_account_type: string;

  @ManyToOne(() => User, (user) => user.installations)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ nullable: true })
  llm_provider: string;

  @Column({ type: 'text', nullable: true })
  llm_api_key_encrypted: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => Repository, (repo) => repo.installation)
  repositories: Repository[];
}
