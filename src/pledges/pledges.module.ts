import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GivingProgram } from './entities/giving-program.entity';
import { Pledge } from './entities/pledge.entity';
import { PledgePayment } from './entities/pledge-payment.entity';
import { UserPin } from './entities/user-pin.entity';
import { User } from '../users/entities/user.entity';
import { GivingProgramsService } from './giving-programs.service';
import { PledgesService } from './pledges.service';
import { PinService } from './pin.service';
import { GivingAnalyticsService } from './giving-analytics.service';
import { GivingProgramsController } from './giving-programs.controller';
import { PledgesController } from './pledges.controller';
import { PinController } from './pin.controller';
import { GivingAnalyticsController } from './giving-analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GivingProgram,
      Pledge,
      PledgePayment,
      UserPin,
      User,
    ]),
  ],
  providers: [
    GivingProgramsService,
    PledgesService,
    PinService,
    GivingAnalyticsService,
  ],
  controllers: [
    GivingProgramsController,
    PledgesController,
    PinController,
    GivingAnalyticsController,
  ],
  exports: [PledgesService, GivingProgramsService],
})
export class PledgesModule {}
