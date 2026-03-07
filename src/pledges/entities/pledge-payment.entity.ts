import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Pledge } from './pledge.entity';
import { PaymentMethod } from './payment-method.enum';

@Entity('pledge_payments')
export class PledgePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Pledge, (pledge) => pledge.payments, { onDelete: 'CASCADE' })
  pledge: Pledge;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true, type: 'varchar' })
  month: string | null;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true, type: 'varchar' })
  referenceNumber: string | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @ManyToOne(() => User, { eager: true })
  recordedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
