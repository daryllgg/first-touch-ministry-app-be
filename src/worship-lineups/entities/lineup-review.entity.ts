import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { WorshipLineup } from './worship-lineup.entity';
import { User } from '../../users/entities/user.entity';
import { LineupStatus } from './lineup-status.enum';

@Entity('lineup_reviews')
export class LineupReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorshipLineup, lineup => lineup.reviews, { onDelete: 'CASCADE' })
  lineup: WorshipLineup;

  @ManyToOne(() => User, { eager: true })
  reviewer: User;

  @Column({ type: 'enum', enum: LineupStatus })
  status: LineupStatus;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;
}
