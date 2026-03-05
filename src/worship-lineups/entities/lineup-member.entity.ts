import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WorshipLineup } from './worship-lineup.entity';
import { InstrumentRole } from './instrument-role.entity';

@Entity('lineup_members')
export class LineupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorshipLineup, (lineup) => lineup.members)
  lineup: WorshipLineup;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @ManyToOne(() => InstrumentRole, { eager: true })
  instrumentRole: InstrumentRole;

  @Column({ nullable: true })
  customRoleName: string;

  @CreateDateColumn()
  createdAt: Date;
}
