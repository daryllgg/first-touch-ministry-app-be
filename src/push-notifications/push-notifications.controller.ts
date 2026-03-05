import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PushNotificationsService } from './push-notifications.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UnregisterPushTokenDto } from './dto/unregister-push-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('push-notifications')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class PushNotificationsController {
  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  @Post('register')
  register(
    @Body() dto: RegisterPushTokenDto,
    @CurrentUser() user: User,
  ) {
    return this.pushNotificationsService.registerToken(user.id, dto);
  }

  @Delete('unregister')
  unregister(@Body() dto: UnregisterPushTokenDto) {
    return this.pushNotificationsService.removeToken(dto.token);
  }
}
