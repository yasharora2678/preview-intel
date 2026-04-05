import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Installation } from './installation.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true })
  github_id: number;

  @Column()
  github_username: string;

  @Column({ type: 'text', nullable: true })
  github_avatar_url: string;

  @Column({ default: false })
  is_admin: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })  // ADD
  email: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })  // ADD — auto-updates on every save()
  updated_at: Date

  @OneToMany(() => Installation, (inst) => inst.user)
  installations: Installation[];
}
