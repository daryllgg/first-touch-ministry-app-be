import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementsRepo: Repository<Announcement>,
  ) {}

  async create(dto: CreateAnnouncementDto, author: User): Promise<Announcement> {
    const announcement = this.announcementsRepo.create({
      ...dto,
      author,
    });
    return this.announcementsRepo.save(announcement);
  }

  async findAll(): Promise<Announcement[]> {
    return this.announcementsRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Announcement> {
    const announcement = await this.announcementsRepo.findOne({ where: { id } });
    if (!announcement) {
      throw new NotFoundException(`Announcement with id ${id} not found`);
    }
    return announcement;
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<Announcement> {
    const announcement = await this.findOne(id);
    Object.assign(announcement, dto);
    return this.announcementsRepo.save(announcement);
  }

  async remove(id: string): Promise<void> {
    const announcement = await this.findOne(id);
    await this.announcementsRepo.remove(announcement);
  }
}
