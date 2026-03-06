import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { AttendanceEntry } from './entities/attendance-entry.entity';
import { Station } from '../youth-profiles/entities/station.entity';
import { YouthProfile } from '../youth-profiles/entities/youth-profile.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private attendanceRecordRepo: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceEntry)
    private attendanceEntryRepo: Repository<AttendanceEntry>,
    @InjectRepository(Station)
    private stationRepo: Repository<Station>,
    @InjectRepository(YouthProfile)
    private youthProfileRepo: Repository<YouthProfile>,
  ) {}

  async create(dto: CreateAttendanceDto, user: User): Promise<AttendanceRecord> {
    const station = await this.stationRepo.findOne({
      where: { id: dto.stationId },
    });
    if (!station) {
      throw new NotFoundException(`Station with id ${dto.stationId} not found`);
    }

    const entries: AttendanceEntry[] = [];
    for (const entryDto of dto.entries) {
      const youthProfile = await this.youthProfileRepo.findOne({
        where: { id: entryDto.youthProfileId },
      });
      if (!youthProfile) {
        throw new NotFoundException(
          `Youth profile with id ${entryDto.youthProfileId} not found`,
        );
      }

      const entry = this.attendanceEntryRepo.create({
        youthProfile,
        present: entryDto.present,
        notes: entryDto.notes || null,
      });
      entries.push(entry);
    }

    const record = this.attendanceRecordRepo.create({
      date: dto.date,
      station,
      recordedBy: user,
      entries,
    });

    return this.attendanceRecordRepo.save(record);
  }

  async findAll(
    dateFrom?: string,
    dateTo?: string,
    stationId?: string,
  ): Promise<AttendanceRecord[]> {
    const qb = this.attendanceRecordRepo
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.station', 'station')
      .leftJoinAndSelect('record.recordedBy', 'recordedBy')
      .leftJoinAndSelect('record.entries', 'entries')
      .leftJoinAndSelect('entries.youthProfile', 'youthProfile');

    if (dateFrom) {
      qb.andWhere('record.date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('record.date <= :dateTo', { dateTo });
    }
    if (stationId) {
      qb.andWhere('station.id = :stationId', { stationId });
    }

    qb.orderBy('record.date', 'DESC');

    return qb.getMany();
  }

  async findOne(id: string): Promise<AttendanceRecord> {
    const record = await this.attendanceRecordRepo.findOne({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`Attendance record with id ${id} not found`);
    }
    return record;
  }

  async findByYouthProfile(youthProfileId: string): Promise<AttendanceEntry[]> {
    return this.attendanceEntryRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.attendanceRecord', 'record')
      .leftJoinAndSelect('record.station', 'station')
      .leftJoinAndSelect('entry.youthProfile', 'youthProfile')
      .where('youthProfile.id = :youthProfileId', { youthProfileId })
      .orderBy('record.date', 'DESC')
      .getMany();
  }
}
