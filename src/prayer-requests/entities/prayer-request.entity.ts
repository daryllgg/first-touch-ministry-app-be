import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PrayerRequestVisibility } from './prayer-request-visibility.enum';

@Entity('prayer_requests')
export class PrayerRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: PrayerRequestVisibility,
    default: PrayerRequestVisibility.PUBLIC,
    nullable: true,
  })
  visibility?: PrayerRequestVisibility;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ nullable: true })
  image: string;

  @ManyToOne(() => User, { eager: true })
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
