import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrayerRequest } from './entities/prayer-request.entity';
import { PrayerRequestsService } from './prayer-requests.service';
import { PrayerRequestsController } from './prayer-requests.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrayerRequest]),
    NotificationsModule,
    UsersModule,
  ],
  providers: [PrayerRequestsService],
  controllers: [PrayerRequestsController],
  exports: [PrayerRequestsService],
})
export class PrayerRequestsModule {}
