import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorshipLineup } from './entities/worship-lineup.entity';
import { LineupMember } from './entities/lineup-member.entity';
import { LineupSong } from './entities/lineup-song.entity';
import { InstrumentRole } from './entities/instrument-role.entity';
import { LineupReview } from './entities/lineup-review.entity';
import { SubstitutionRequest } from './entities/substitution-request.entity';
import { WorshipLineupsService } from './worship-lineups.service';
import { WorshipLineupsController } from './worship-lineups.controller';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorshipLineup,
      LineupMember,
      LineupSong,
      InstrumentRole,
      LineupReview,
      SubstitutionRequest,
    ]),
    UsersModule,
    forwardRef(() => NotificationsModule),
  ],
  providers: [WorshipLineupsService],
  controllers: [WorshipLineupsController],
  exports: [WorshipLineupsService],
})
export class WorshipLineupsModule {}
