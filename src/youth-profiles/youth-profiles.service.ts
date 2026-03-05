import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YouthProfile } from './entities/youth-profile.entity';
import { Station } from './entities/station.entity';
import { CreateYouthProfileDto } from './dto/create-youth-profile.dto';
import { UpdateYouthProfileDto } from './dto/update-youth-profile.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class YouthProfilesService {
  constructor(
    @InjectRepository(YouthProfile)
    private youthProfilesRepo: Repository<YouthProfile>,
    @InjectRepository(Station)
    private stationRepo: Repository<Station>,
  ) {}

  async create(
    dto: CreateYouthProfileDto,
    photo: Express.Multer.File | null,
    createdBy: User,
  ): Promise<YouthProfile> {
    const { stationId, ...rest } = dto;

    let station: Station | undefined;
    if (stationId) {
      const found = await this.stationRepo.findOne({ where: { id: stationId } });
      if (!found) {
        throw new NotFoundException(`Station with id ${stationId} not found`);
      }
      station = found;
    }

    const profile = this.youthProfilesRepo.create({
      ...rest,
      station,
      photo: photo ? `youth-photos/${photo.filename}` : undefined,
      createdBy,
    } as Partial<YouthProfile>);
    return this.youthProfilesRepo.save(profile as YouthProfile);
  }

  async findAll(): Promise<YouthProfile[]> {
    return this.youthProfilesRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<YouthProfile> {
    const profile = await this.youthProfilesRepo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Youth profile with id ${id} not found`);
    }
    return profile;
  }

  async update(
    id: string,
    dto: UpdateYouthProfileDto,
    photo?: Express.Multer.File,
  ): Promise<YouthProfile> {
    const profile = await this.findOne(id);
    const { stationId, ...rest } = dto;

    Object.assign(profile, rest);

    if (stationId) {
      const found = await this.stationRepo.findOne({ where: { id: stationId } });
      if (!found) {
        throw new NotFoundException(`Station with id ${stationId} not found`);
      }
      profile.station = found;
    }

    if (photo) {
      profile.photo = `youth-photos/${photo.filename}`;
    }
    await this.youthProfilesRepo.save(profile);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const profile = await this.findOne(id);
    profile.isActive = false;
    await this.youthProfilesRepo.save(profile);
  }

  async uploadPhoto(id: string, file: Express.Multer.File): Promise<YouthProfile> {
    const profile = await this.findOne(id);
    profile.photo = `youth-photos/${file.filename}`;
    await this.youthProfilesRepo.save(profile);
    return this.findOne(id);
  }

  // Station methods
  async findAllStations(): Promise<Station[]> {
    return this.stationRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async createStation(name: string): Promise<Station> {
    const station = this.stationRepo.create({ name });
    return this.stationRepo.save(station);
  }

  async deleteStation(id: string): Promise<void> {
    const station = await this.stationRepo.findOne({ where: { id } });
    if (!station) {
      throw new NotFoundException(`Station with id ${id} not found`);
    }
    station.isActive = false;
    await this.stationRepo.save(station);
  }
}
