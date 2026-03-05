import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('profile_change_requests')
export class ProfileChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column('jsonb')
  requestedChanges: Record<string, any>;

  @Column({ default: 'PENDING' })
  status: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  reviewedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
