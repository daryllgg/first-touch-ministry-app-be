import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LineupMember } from './lineup-member.entity';
import { SubstitutionStatus } from './substitution-status.enum';

@Entity('substitution_requests')
export class SubstitutionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LineupMember, { eager: true })
  lineupMember: LineupMember;

  @ManyToOne(() => User, { eager: true })
  requestedBy: User;

  @ManyToOne(() => User, { nullable: true, eager: true })
  substituteUser: User;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: SubstitutionStatus, default: SubstitutionStatus.PENDING })
  status: SubstitutionStatus;

  @ManyToOne(() => User, { nullable: true })
  respondedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
