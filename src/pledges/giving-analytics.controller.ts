import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GivingAnalyticsService } from './giving-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../users/entities/role.enum';

@Controller('giving-analytics')
@UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
@Roles(RoleName.PASTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
export class GivingAnalyticsController {
  constructor(private readonly analyticsService: GivingAnalyticsService) {}

  @Get('summary')
  getSummary(@Query('year') year?: string) {
    return this.analyticsService.getSummary(year ? parseInt(year) : undefined);
  }

  @Get('trends')
  getTrends(@Query('year') year?: string) {
    return this.analyticsService.getMonthlyTrends(year ? parseInt(year) : undefined);
  }

  @Get('compliance')
  getCompliance(@Query('programId') programId: string) {
    return this.analyticsService.getCompliance(programId);
  }

  @Get('overdue')
  getOverdue(@Query('programId') programId: string) {
    return this.analyticsService.getOverdue(programId);
  }
}
