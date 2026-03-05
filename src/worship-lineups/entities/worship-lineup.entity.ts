import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LineupStatus } from './lineup-status.enum';
import { ServiceType } from './service-type.enum';
import { LineupMember } from './lineup-member.entity';
import { LineupSong } from './lineup-song.entity';
import { LineupReview } from './lineup-review.entity';

@Entity('worship_lineups')
export class WorshipLineup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('simple-array')
  dates: string[];

  @Column({ type: 'enum', enum: ServiceType })
  serviceType: ServiceType;

  @Column({ nullable: true })
  customServiceName: string;

  @ManyToOne(() => User, { eager: true })
  submittedBy: User;

  @Column({ type: 'enum', enum: LineupStatus, default: LineupStatus.PENDING })
  status: LineupStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  reviewedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @OneToMany(() => LineupMember, (member) => member.lineup, { eager: true })
  members: LineupMember[];

  @OneToMany(() => LineupSong, (song) => song.lineup, { eager: true, cascade: true })
  songs: LineupSong[];

  @OneToMany(() => LineupReview, (review) => review.lineup, { eager: true, cascade: true })
  reviews: LineupReview[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
