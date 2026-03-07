import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pledge } from './entities/pledge.entity';
import { PledgePayment } from './entities/pledge-payment.entity';
import { GivingProgram } from './entities/giving-program.entity';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { UpdatePledgeDto } from './dto/update-pledge.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PledgesService {
  constructor(
    @InjectRepository(Pledge)
    private pledgeRepo: Repository<Pledge>,
    @InjectRepository(PledgePayment)
    private paymentRepo: Repository<PledgePayment>,
    @InjectRepository(GivingProgram)
    private programRepo: Repository<GivingProgram>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // --- Pledges ---

  async create(dto: CreatePledgeDto, adminUser: User): Promise<Pledge> {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

    const program = await this.programRepo.findOne({ where: { id: dto.programId } });
    if (!program) throw new NotFoundException(`Program ${dto.programId} not found`);

    const pledge = this.pledgeRepo.create({
      user,
      program,
      pledgeAmount: dto.pledgeAmount,
      totalMonths: dto.totalMonths || null,
      startMonth: dto.startMonth || null,
      monthlyAmounts: dto.monthlyAmounts || null,
      notes: dto.notes || null,
      createdBy: adminUser,
    });
    return this.pledgeRepo.save(pledge);
  }

  async findByProgram(programId: string): Promise<Pledge[]> {
    return this.pledgeRepo
      .createQueryBuilder('pledge')
      .leftJoinAndSelect('pledge.user', 'user')
      .leftJoinAndSelect('pledge.program', 'program')
      .leftJoinAndSelect('pledge.createdBy', 'createdBy')
      .leftJoinAndSelect('pledge.payments', 'payments')
      .where('program.id = :programId', { programId })
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getMany();
  }

  async findByUser(userId: string): Promise<Pledge[]> {
    return this.pledgeRepo
      .createQueryBuilder('pledge')
      .leftJoinAndSelect('pledge.user', 'user')
      .leftJoinAndSelect('pledge.program', 'program')
      .leftJoinAndSelect('pledge.payments', 'payments')
      .leftJoinAndSelect('payments.recordedBy', 'recordedBy')
      .where('user.id = :userId', { userId })
      .andWhere('program.isActive = true')
      .orderBy('program.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<Pledge> {
    const pledge = await this.pledgeRepo
      .createQueryBuilder('pledge')
      .leftJoinAndSelect('pledge.user', 'user')
      .leftJoinAndSelect('pledge.program', 'program')
      .leftJoinAndSelect('pledge.createdBy', 'createdBy')
      .leftJoinAndSelect('pledge.payments', 'payments')
      .leftJoinAndSelect('payments.recordedBy', 'recordedBy')
      .where('pledge.id = :id', { id })
      .orderBy('payments.date', 'DESC')
      .getOne();
    if (!pledge) throw new NotFoundException(`Pledge ${id} not found`);
    return pledge;
  }

  async update(id: string, dto: UpdatePledgeDto): Promise<Pledge> {
    const pledge = await this.findOne(id);
    Object.assign(pledge, {
      ...(dto.pledgeAmount !== undefined && { pledgeAmount: dto.pledgeAmount }),
      ...(dto.totalMonths !== undefined && { totalMonths: dto.totalMonths }),
      ...(dto.startMonth !== undefined && { startMonth: dto.startMonth }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.monthlyAmounts !== undefined && { monthlyAmounts: dto.monthlyAmounts }),
    });
    return this.pledgeRepo.save(pledge);
  }

  async remove(id: string): Promise<void> {
    const pledge = await this.findOne(id);
    await this.pledgeRepo.remove(pledge);
  }

  // --- Payments ---

  async createPayment(pledgeId: string, dto: CreatePaymentDto, user: User): Promise<PledgePayment> {
    const pledge = await this.findOne(pledgeId);
    const payment = this.paymentRepo.create({
      pledge,
      amount: dto.amount,
      date: dto.date,
      month: dto.month || null,
      paymentMethod: dto.paymentMethod,
      referenceNumber: dto.referenceNumber || null,
      notes: dto.notes || null,
      recordedBy: user,
    });
    return this.paymentRepo.save(payment);
  }

  async updatePayment(paymentId: string, dto: UpdatePaymentDto): Promise<PledgePayment> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    Object.assign(payment, dto);
    return this.paymentRepo.save(payment);
  }

  async removePayment(paymentId: string): Promise<void> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    await this.paymentRepo.remove(payment);
  }
}
