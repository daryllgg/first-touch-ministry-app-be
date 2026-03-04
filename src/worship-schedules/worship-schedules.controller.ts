import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WorshipSchedulesService } from './worship-schedules.service';
import { CreateWorshipScheduleDto } from './dto/create-worship-schedule.dto';
import { UpdateWorshipScheduleDto } from './dto/update-worship-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName } from '../users/entities/role.enum';
import { User } from '../users/entities/user.entity';

@Controller('worship-schedules')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class WorshipSchedulesController {
  constructor(private readonly worshipSchedulesService: WorshipSchedulesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.WORSHIP_LEADER, RoleName.WORSHIP_TEAM_HEAD, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  create(@Body() dto: CreateWorshipScheduleDto, @CurrentUser() user: User) {
    return this.worshipSchedulesService.create(dto, user);
  }

  @Get()
  findAll() {
    return this.worshipSchedulesService.findAll();
  }

  @Get('upcoming')
  findUpcoming() {
    return this.worshipSchedulesService.findUpcoming();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.worshipSchedulesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.WORSHIP_LEADER, RoleName.WORSHIP_TEAM_HEAD, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateWorshipScheduleDto) {
    return this.worshipSchedulesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.worshipSchedulesService.remove(id);
  }
}
