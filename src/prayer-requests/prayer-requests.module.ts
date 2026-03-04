import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrayerRequest } from './entities/prayer-request.entity';
import { PrayerRequestsService } from './prayer-requests.service';
import { PrayerRequestsController } from './prayer-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PrayerRequest])],
  providers: [PrayerRequestsService],
  controllers: [PrayerRequestsController],
  exports: [PrayerRequestsService],
})
export class PrayerRequestsModule {}
