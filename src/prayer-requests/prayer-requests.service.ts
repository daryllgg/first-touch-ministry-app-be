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
import { RoleName } from '../users/entities/role.enum';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification-type.enum';
import { UsersService } from '../users/users.service';

const PRIVILEGED_ROLES: RoleName[] = [
  RoleName.PASTOR,
  RoleName.LEADER,
  RoleName.ADMIN,
  RoleName.SUPER_ADMIN,
];

@Injectable()
export class PrayerRequestsService {
  constructor(
    @InjectRepository(PrayerRequest)
    private prayerRequestsRepo: Repository<PrayerRequest>,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreatePrayerRequestDto,
    author: User,
    image?: Express.Multer.File,
  ): Promise<PrayerRequest> {
    const isPrivileged = author.roles?.some((r) =>
      PRIVILEGED_ROLES.includes(r.name),
    );

    const prayerRequest = this.prayerRequestsRepo.create({
      ...dto,
      author,
      isApproved: isPrivileged ? true : false,
      image: image ? `prayer-request-images/${image.filename}` : undefined,
    });

    const saved = await this.prayerRequestsRepo.save(prayerRequest);

    // Notify admins/pastors about pending prayer requests from normal users
    if (!isPrivileged) {
      try {
        const allUsers = await this.usersService.findAll();
        const adminUsers = allUsers.filter((u) =>
          u.roles?.some((r) =>
            [RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.PASTOR].includes(
              r.name,
            ),
          ),
        );
        const adminIds = adminUsers.map((u) => u.id);

        if (adminIds.length > 0) {
          await this.notificationsService.createForMultipleUsers(
            adminIds,
            NotificationType.PRAYER_REQUEST_PENDING,
            'New Prayer Request Pending Approval',
            `${author.firstName} ${author.lastName} submitted a prayer request that needs approval.`,
            saved.id,
            'prayer_request',
          );

          adminIds.forEach((adminId) => {
            this.notificationsGateway.sendToUser(adminId, 'notification', {
              type: NotificationType.PRAYER_REQUEST_PENDING,
              title: 'New Prayer Request Pending Approval',
              relatedEntityId: saved.id,
            });
          });
        }
      } catch (error) {
        // TODO: Log notification error; don't fail the create operation
        console.error('Failed to send pending prayer request notifications:', error);
      }
    }

    return saved;
  }

  async findAll(requestingUser: User): Promise<PrayerRequest[]> {
    const isPrivileged = requestingUser.roles?.some((r) =>
      PRIVILEGED_ROLES.includes(r.name),
    );

    if (isPrivileged) {
      // Privileged users see all approved prayer requests
      return this.prayerRequestsRepo.find({
        where: { isApproved: true },
        order: { createdAt: 'DESC' },
      });
    }

    // Normal users see only approved prayer requests
    return this.prayerRequestsRepo.find({
      where: { isApproved: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findPending(): Promise<PrayerRequest[]> {
    return this.prayerRequestsRepo.find({
      where: { isApproved: false },
      order: { createdAt: 'DESC' },
    });
  }

  async approve(id: string, approver: User): Promise<PrayerRequest> {
    const pr = await this.findOne(id);
    pr.isApproved = true;
    const saved = await this.prayerRequestsRepo.save(pr);

    // Notify the author that their prayer request has been published
    try {
      await this.notificationsService.createForUser(
        pr.author.id,
        NotificationType.PRAYER_REQUEST_PUBLISHED,
        'Prayer Request Published',
        'Your prayer request has been approved and published.',
        pr.id,
        'prayer_request',
      );

      this.notificationsGateway.sendToUser(pr.author.id, 'notification', {
        type: NotificationType.PRAYER_REQUEST_PUBLISHED,
        title: 'Prayer Request Published',
        relatedEntityId: pr.id,
      });
    } catch (error) {
      // TODO: Log notification error; don't fail the approve operation
      console.error('Failed to send prayer request approval notification:', error);
    }

    return saved;
  }

  async findOne(id: string): Promise<PrayerRequest> {
    const pr = await this.prayerRequestsRepo.findOne({ where: { id } });
    if (!pr) throw new NotFoundException('Prayer request not found');
    return pr;
  }

  async remove(id: string, requestingUser: User): Promise<void> {
    const pr = await this.findOne(id);
    const isAdmin = requestingUser.roles?.some((r) =>
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
