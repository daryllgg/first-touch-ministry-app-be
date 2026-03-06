import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { PrayerRequestsModule } from './prayer-requests/prayer-requests.module';
import { WorshipLineupsModule } from './worship-lineups/worship-lineups.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';
import { NotificationsModule } from './notifications/notifications.module';
import { YouthProfilesModule } from './youth-profiles/youth-profiles.module';
import { ArticlesModule } from './articles/articles.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
        ssl: configService.get('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
    UsersModule,
    AuthModule,
    AnnouncementsModule,
    PrayerRequestsModule,
    WorshipLineupsModule,
    PushNotificationsModule,
    NotificationsModule,
    YouthProfilesModule,
    ArticlesModule,
    AttendanceModule,
  ],
})
export class AppModule {}
