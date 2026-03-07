import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GivingProgram } from './giving-program.entity';
import { PledgePayment } from './pledge-payment.entity';

@Entity('pledges')
export class Pledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @ManyToOne(() => GivingProgram, { eager: true })
  program: GivingProgram;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  pledgeAmount: number;

  @Column({ nullable: true, type: 'int' })
  totalMonths: number | null;

  @Column({ nullable: true, type: 'varchar' })
  startMonth: string | null;

  @Column({ nullable: true, type: 'jsonb' })
  monthlyAmounts: Record<string, number> | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @ManyToOne(() => User, { eager: true })
  createdBy: User;

  @OneToMany(() => PledgePayment, (payment) => payment.pledge, {
    cascade: true,
    eager: true,
  })
  payments: PledgePayment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
