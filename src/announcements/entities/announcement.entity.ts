import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AnnouncementAudience } from './announcement-audience.enum';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @ManyToOne(() => User, { eager: true })
  author: User;

  @Column('simple-array', { nullable: true })
  images: string[];

  @Column({
    type: 'enum',
    enum: AnnouncementAudience,
    default: AnnouncementAudience.PUBLIC,
  })
  audience: AnnouncementAudience;

  @ManyToMany(() => User)
  @JoinTable()
  mentionedUsers: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
