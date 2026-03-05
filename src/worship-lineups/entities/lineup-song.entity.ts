import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { WorshipLineup } from './worship-lineup.entity';
import { User } from '../../users/entities/user.entity';

@Entity('lineup_songs')
export class LineupSong {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorshipLineup, lineup => lineup.songs, { onDelete: 'CASCADE' })
  lineup: WorshipLineup;

  @Column()
  title: string;

  @Column({ nullable: true })
  link: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  singer: User;

  @Column({ default: 0 })
  orderIndex: number;

  @CreateDateColumn()
  createdAt: Date;
}
