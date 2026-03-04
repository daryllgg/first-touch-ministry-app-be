import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorshipSchedule } from './entities/worship-schedule.entity';
import { WorshipSchedulesService } from './worship-schedules.service';
import { WorshipSchedulesController } from './worship-schedules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorshipSchedule])],
  providers: [WorshipSchedulesService],
  controllers: [WorshipSchedulesController],
  exports: [WorshipSchedulesService],
})
export class WorshipSchedulesModule {}
