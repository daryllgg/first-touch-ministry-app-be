import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { WorshipSchedule } from './entities/worship-schedule.entity';
import { CreateWorshipScheduleDto } from './dto/create-worship-schedule.dto';
import { UpdateWorshipScheduleDto } from './dto/update-worship-schedule.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class WorshipSchedulesService {
  constructor(
    @InjectRepository(WorshipSchedule)
    private schedulesRepo: Repository<WorshipSchedule>,
  ) {}

  async create(dto: CreateWorshipScheduleDto, createdBy: User): Promise<WorshipSchedule> {
    const schedule = this.schedulesRepo.create({ ...dto, createdBy });
    return this.schedulesRepo.save(schedule);
  }

  async findAll(): Promise<WorshipSchedule[]> {
    return this.schedulesRepo.find({ order: { scheduledDate: 'ASC' } });
  }

  async findUpcoming(): Promise<WorshipSchedule[]> {
    return this.schedulesRepo.find({
      where: { scheduledDate: MoreThanOrEqual(new Date()) },
      order: { scheduledDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<WorshipSchedule> {
    const schedule = await this.schedulesRepo.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException('Worship schedule not found');
    return schedule;
  }

  async update(id: string, dto: UpdateWorshipScheduleDto): Promise<WorshipSchedule> {
    const schedule = await this.findOne(id);
    Object.assign(schedule, dto);
    return this.schedulesRepo.save(schedule);
  }

  async remove(id: string): Promise<void> {
    const schedule = await this.findOne(id);
    await this.schedulesRepo.remove(schedule);
  }
}
