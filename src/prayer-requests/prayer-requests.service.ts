import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrayerRequest } from './entities/prayer-request.entity';
import { CreatePrayerRequestDto } from './dto/create-prayer-request.dto';
import { User } from '../users/entities/user.entity';
import { PrayerRequestVisibility } from './entities/prayer-request-visibility.enum';
import { RoleName } from '../users/entities/role.enum';

@Injectable()
export class PrayerRequestsService {
  constructor(
    @InjectRepository(PrayerRequest)
    private prayerRequestsRepo: Repository<PrayerRequest>,
  ) {}

  async create(
    dto: CreatePrayerRequestDto,
    author: User,
  ): Promise<PrayerRequest> {
    const prayerRequest = this.prayerRequestsRepo.create({ ...dto, author });
    return this.prayerRequestsRepo.save(prayerRequest);
  }

  async findAll(requestingUser: User): Promise<PrayerRequest[]> {
    const privilegedRoles = [
      RoleName.PASTOR,
      RoleName.LEADER,
      RoleName.ADMIN,
      RoleName.SUPER_ADMIN,
    ];
    const isPrivileged = requestingUser.roles.some((r) =>
      privilegedRoles.includes(r.name),
    );

    if (isPrivileged) {
      return this.prayerRequestsRepo.find({ order: { createdAt: 'DESC' } });
    }

    // Normal users see PUBLIC + their own PRIVATE
    return this.prayerRequestsRepo.find({
      where: [
        { visibility: PrayerRequestVisibility.PUBLIC },
        { author: { id: requestingUser.id } },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PrayerRequest> {
    const pr = await this.prayerRequestsRepo.findOne({ where: { id } });
    if (!pr) throw new NotFoundException('Prayer request not found');
    return pr;
  }

  async remove(id: string, requestingUser: User): Promise<void> {
    const pr = await this.findOne(id);
    const isAdmin = requestingUser.roles.some((r) =>
      [RoleName.ADMIN, RoleName.SUPER_ADMIN].includes(r.name),
    );
    if (pr.author.id !== requestingUser.id && !isAdmin) {
      throw new ForbiddenException(
        'You can only delete your own prayer requests',
      );
    }
    await this.prayerRequestsRepo.remove(pr);
  }
}
