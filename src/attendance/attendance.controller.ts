import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName } from '../users/entities/role.enum';
import { User } from '../users/entities/user.entity';

@Controller('attendance')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(
    RoleName.PASTOR,
    RoleName.LEADER,
    RoleName.OUTREACH_WORKER,
    RoleName.ADMIN,
    RoleName.SUPER_ADMIN,
  )
  create(@Body() dto: CreateAttendanceDto, @CurrentUser() user: User) {
    return this.attendanceService.create(dto, user);
  }

  @Get()
  findAll(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('stationId') stationId?: string,
  ) {
    return this.attendanceService.findAll(dateFrom, dateTo, stationId);
  }

  // IMPORTANT: this route MUST come before :id to avoid conflict
  @Get('youth-profile/:id')
  findByYouthProfile(@Param('id') id: string) {
    return this.attendanceService.findByYouthProfile(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }
}
