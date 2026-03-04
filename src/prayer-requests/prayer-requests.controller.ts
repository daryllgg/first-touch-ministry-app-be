import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PrayerRequestsService } from './prayer-requests.service';
import { CreatePrayerRequestDto } from './dto/create-prayer-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('prayer-requests')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class PrayerRequestsController {
  constructor(
    private readonly prayerRequestsService: PrayerRequestsService,
  ) {}

  @Post()
  create(
    @Body() dto: CreatePrayerRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.prayerRequestsService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.prayerRequestsService.findAll(user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.prayerRequestsService.remove(id, user);
  }
}
