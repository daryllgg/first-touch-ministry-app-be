import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementAudience } from './entities/announcement-audience.enum';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { User } from '../users/entities/user.entity';
import { RoleName } from '../users/entities/role.enum';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification-type.enum';
import { UsersService } from '../users/users.service';

/** Roles that can see WORSHIP_TEAM announcements */
const WORSHIP_TEAM_ROLES: string[] = [
  RoleName.WORSHIP_LEADER,
  RoleName.WORSHIP_TEAM_HEAD,
  RoleName.GUITARIST,
  RoleName.KEYBOARDIST,
  RoleName.DRUMMER,
  RoleName.BASSIST,
  RoleName.SINGER,
  RoleName.ADMIN,
  RoleName.SUPER_ADMIN,
  RoleName.PASTOR,
];

/** Roles that can see OUTREACH announcements */
const OUTREACH_ROLES: string[] = [
  RoleName.OUTREACH_WORKER,
  RoleName.LEADER,
  RoleName.PASTOR,
  RoleName.ADMIN,
  RoleName.SUPER_ADMIN,
];

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementsRepo: Repository<Announcement>,
    @Optional() private notificationsGateway?: NotificationsGateway,
    @Optional() private notificationsService?: NotificationsService,
    @Optional() private usersService?: UsersService,
  ) {}

  async create(
    dto: CreateAnnouncementDto,
    author: User,
    images?: Express.Multer.File[],
  ): Promise<Announcement> {
    const imagePaths = images?.map(
      (file) => `announcement-images/${file.filename}`,
    );

    const announcement = this.announcementsRepo.create({
      ...dto,
      author,
      images: imagePaths || [],
    });

    const saved = await this.announcementsRepo.save(announcement);

    // Send targeted notifications based on audience
    if (this.usersService) {
      try {
        const users = await this.usersService.findAll();
        const audienceRoles = this.getAudienceRoles(
          saved.audience || AnnouncementAudience.PUBLIC,
        );

        const targetUsers = (
          saved.audience === AnnouncementAudience.PUBLIC
            ? users
            : users.filter((u) =>
                u.roles?.some((r) => audienceRoles.includes(r.name)),
              )
        ).filter((u) => u.id !== author.id);

        // WebSocket notifications
        if (this.notificationsGateway) {
          for (const user of targetUsers) {
            this.notificationsGateway.sendToUser(
              user.id,
              'new-announcement',
              {
                id: saved.id,
                title: saved.title,
                audience: saved.audience,
              },
            );
          }
        }

        // DB notifications
        if (this.notificationsService && targetUsers.length > 0) {
          await this.notificationsService.createForMultipleUsers(
            targetUsers.map((u) => u.id),
            NotificationType.ANNOUNCEMENT,
            'New Announcement',
            `${author.firstName} posted: ${saved.title}`,
            saved.id,
            'announcement',
          );
        }
      } catch {
        // Notification sending is best-effort; do not fail the create
      }
    }

    // Handle @mentions
    if (dto.mentionedUserIds?.length && this.usersService) {
      try {
        const mentionedUsers: User[] = [];
        for (const uid of dto.mentionedUserIds) {
          const u = await this.usersService.findById(uid);
          if (u) mentionedUsers.push(u);
        }
        saved.mentionedUsers = mentionedUsers;
        await this.announcementsRepo.save(saved);

        if (this.notificationsService && mentionedUsers.length > 0) {
          const mentionUserIds = mentionedUsers
            .filter((u) => u.id !== author.id)
            .map((u) => u.id);
          if (mentionUserIds.length > 0) {
            await this.notificationsService.createForMultipleUsers(
              mentionUserIds,
              NotificationType.ANNOUNCEMENT,
              'You were mentioned',
              `${author.firstName} mentioned you in: ${saved.title}`,
              saved.id,
              'announcement',
            );
          }
        }
      } catch {
        // Mention handling is best-effort
      }
    }

    return saved;
  }

  async findAll(userRoles?: string[]): Promise<Announcement[]> {
    // If no roles provided, return only PUBLIC announcements
    if (!userRoles || userRoles.length === 0) {
      return this.announcementsRepo.find({
        where: { audience: AnnouncementAudience.PUBLIC },
        order: { createdAt: 'DESC' },
      });
    }

    // Determine which audiences this user can see
    const visibleAudiences: AnnouncementAudience[] = [
      AnnouncementAudience.PUBLIC,
    ];

    const hasAnyRole = (roles: string[]) =>
      userRoles.some((r) => roles.includes(r));

    if (hasAnyRole(WORSHIP_TEAM_ROLES)) {
      visibleAudiences.push(AnnouncementAudience.WORSHIP_TEAM);
    }

    if (hasAnyRole(OUTREACH_ROLES)) {
      visibleAudiences.push(AnnouncementAudience.OUTREACH);
    }

    return this.announcementsRepo.find({
      where: { audience: In(visibleAudiences) },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Announcement> {
    const announcement = await this.announcementsRepo.findOne({
      where: { id },
    });
    if (!announcement) {
      throw new NotFoundException(`Announcement with id ${id} not found`);
    }
    return announcement;
  }

  async update(
    id: string,
    dto: UpdateAnnouncementDto,
  ): Promise<Announcement> {
    const announcement = await this.findOne(id);
    Object.assign(announcement, dto);
    await this.announcementsRepo.save(announcement);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const announcement = await this.findOne(id);
    await this.announcementsRepo.remove(announcement);
  }

  private getAudienceRoles(audience: AnnouncementAudience): string[] {
    switch (audience) {
      case AnnouncementAudience.WORSHIP_TEAM:
        return WORSHIP_TEAM_ROLES;
      case AnnouncementAudience.OUTREACH:
        return OUTREACH_ROLES;
      case AnnouncementAudience.PUBLIC:
      default:
        return [];
    }
  }
}
