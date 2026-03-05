import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Gender } from './gender.enum';
import { Station } from './station.entity';

@Entity('youth_profiles')
export class YouthProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ type: 'date' })
  birthDate: string;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ nullable: true })
  photo: string;

  @ManyToOne(() => Station, { eager: true, nullable: true })
  station: Station;

  @Column({ nullable: true })
  parentsName: string;

  @Column({ nullable: true })
  motherName: string;

  @Column({ nullable: true })
  fatherName: string;

  @Column({ nullable: true })
  facebookLink: string;

  @Column()
  contactNumber: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, { eager: true })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
