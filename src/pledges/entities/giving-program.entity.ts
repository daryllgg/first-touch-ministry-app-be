import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ProgramType } from './program-type.enum';

@Entity('giving_programs')
export class GivingProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ProgramType })
  type: ProgramType;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ nullable: true, type: 'date' })
  startDate: string | null;

  @Column({ nullable: true, type: 'date' })
  endDate: string | null;

  @Column({ nullable: true, type: 'date' })
  conductedDate: string | null;

  @Column({ nullable: true, type: 'jsonb' })
  programMonths: string[] | null;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, { eager: true })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
