import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YouthProfile } from './entities/youth-profile.entity';
import { Station } from './entities/station.entity';
import { YouthProfilesService } from './youth-profiles.service';
import { YouthProfilesController } from './youth-profiles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([YouthProfile, Station])],
  providers: [YouthProfilesService],
  controllers: [YouthProfilesController],
  exports: [YouthProfilesService],
})
export class YouthProfilesModule {}
