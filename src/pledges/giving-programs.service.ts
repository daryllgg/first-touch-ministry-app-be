import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GivingProgram } from './entities/giving-program.entity';
import { Pledge } from './entities/pledge.entity';
import { PledgePayment } from './entities/pledge-payment.entity';
import { CreateGivingProgramDto } from './dto/create-giving-program.dto';
import { UpdateGivingProgramDto } from './dto/update-giving-program.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class GivingProgramsService {
  constructor(
    @InjectRepository(GivingProgram)
    private programRepo: Repository<GivingProgram>,
    @InjectRepository(Pledge)
    private pledgeRepo: Repository<Pledge>,
    @InjectRepository(PledgePayment)
    private paymentRepo: Repository<PledgePayment>,
  ) {}

  async create(dto: CreateGivingProgramDto, user: User): Promise<GivingProgram> {
    const program = this.programRepo.create({
      ...dto,
      createdBy: user,
    });
    return this.programRepo.save(program);
  }

  async findAll(): Promise<GivingProgram[]> {
    return this.programRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<GivingProgram[]> {
    return this.programRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<GivingProgram> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException(`Program ${id} not found`);
    return program;
  }

  async update(id: string, dto: UpdateGivingProgramDto): Promise<GivingProgram> {
    const program = await this.findOne(id);
    Object.assign(program, dto);
    return this.programRepo.save(program);
  }

  async remove(id: string): Promise<void> {
    const program = await this.findOne(id);
    const pledges = await this.pledgeRepo.find({
      where: { program: { id } },
      relations: ['payments'],
    });
    for (const pledge of pledges) {
      if (pledge.payments.length > 0) {
        await this.paymentRepo.remove(pledge.payments);
      }
    }
    if (pledges.length > 0) {
      await this.pledgeRepo.remove(pledges);
    }
    await this.programRepo.remove(program);
  }
}
