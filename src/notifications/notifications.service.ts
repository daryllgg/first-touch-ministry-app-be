import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationType } from './entities/notification-type.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepo: Repository<Notification>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepo.create({
      user: { id: dto.userId } as any,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      relatedEntityId: dto.relatedEntityId,
      relatedEntityType: dto.relatedEntityType,
    });
    return this.notificationsRepo.save(notification);
  }

  async createForUser(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedEntityId?: string,
    relatedEntityType?: string,
  ): Promise<Notification> {
    const notification = this.notificationsRepo.create({
      user: { id: userId } as any,
      type,
      title,
      message,
      relatedEntityId,
      relatedEntityType,
    });
    return this.notificationsRepo.save(notification);
  }

  async createForMultipleUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    relatedEntityId?: string,
    relatedEntityType?: string,
  ): Promise<Notification[]> {
    const notifications = userIds.map((userId) =>
      this.notificationsRepo.create({
        user: { id: userId } as any,
        type,
        title,
        message,
        relatedEntityId,
        relatedEntityType,
      }),
    );
    return this.notificationsRepo.save(notifications);
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.notificationsRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findUnreadByUser(userId: string): Promise<Notification[]> {
    return this.notificationsRepo.find({
      where: { user: { id: userId }, isRead: false },
      order: { createdAt: 'DESC' },
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationsRepo.count({
      where: { user: { id: userId }, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!notification) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }
    notification.isRead = true;
    return this.notificationsRepo.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepo.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.notificationsRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!notification) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }
    await this.notificationsRepo.remove(notification);
  }

  async removeAll(userId: string): Promise<void> {
    await this.notificationsRepo.delete({ user: { id: userId } });
  }
}
