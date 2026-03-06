import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';
import { YouthProfile } from '../../youth-profiles/entities/youth-profile.entity';

@Entity('attendance_entries')
export class AttendanceEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AttendanceRecord, (record) => record.entries, {
    onDelete: 'CASCADE',
  })
  attendanceRecord: AttendanceRecord;

  @ManyToOne(() => YouthProfile, { eager: true })
  youthProfile: YouthProfile;

  @Column()
  present: boolean;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;
}
