import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Station } from '../../youth-profiles/entities/station.entity';
import { User } from '../../users/entities/user.entity';
import { AttendanceEntry } from './attendance-entry.entity';

@Entity('attendance_records')
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @ManyToOne(() => Station, { eager: true })
  station: Station;

  @ManyToOne(() => User, { eager: true })
  recordedBy: User;

  @OneToMany(() => AttendanceEntry, (entry) => entry.attendanceRecord, {
    cascade: true,
    eager: true,
  })
  entries: AttendanceEntry[];

  @CreateDateColumn()
  createdAt: Date;
}
