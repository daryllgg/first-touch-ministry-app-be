import { Controller, Post, Patch, Get, Body, UseGuards } from '@nestjs/common';
import { PinService } from './pin.service';
import { SetupPinDto } from './dto/setup-pin.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { ChangePinDto } from './dto/change-pin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('user-pin')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class PinController {
  constructor(private readonly pinService: PinService) {}

  @Get('status')
  hasPin(@CurrentUser() user: User) {
    return this.pinService.hasPin(user);
  }

  @Post('setup')
  setup(@Body() dto: SetupPinDto, @CurrentUser() user: User) {
    return this.pinService.setup(user, dto.pin);
  }

  @Post('verify')
  verify(@Body() dto: VerifyPinDto, @CurrentUser() user: User) {
    return this.pinService.verify(user, dto.pin);
  }

  @Patch('change')
  change(@Body() dto: ChangePinDto, @CurrentUser() user: User) {
    return this.pinService.change(user, dto.currentPin, dto.newPin);
  }
}
