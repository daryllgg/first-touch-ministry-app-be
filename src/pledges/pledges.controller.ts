import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { PledgesService } from './pledges.service';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { UpdatePledgeDto } from './dto/update-pledge.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName } from '../users/entities/role.enum';
import { User } from '../users/entities/user.entity';

@Controller('pledges')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class PledgesController {
  constructor(private readonly service: PledgesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  create(@Body() dto: CreatePledgeDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  // IMPORTANT: /my must come before /:id
  @Get('my')
  findMine(@CurrentUser() user: User) {
    return this.service.findByUser(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  findByProgram(@Query('programId') programId: string) {
    return this.service.findByProgram(programId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePledgeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // --- Payments ---

  @Post(':id/payments')
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  createPayment(
    @Param('id') pledgeId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.service.createPayment(pledgeId, dto, user);
  }

  @Patch('payments/:paymentId')
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  updatePayment(@Param('paymentId') paymentId: string, @Body() dto: UpdatePaymentDto) {
    return this.service.updatePayment(paymentId, dto);
  }

  @Delete('payments/:paymentId')
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  removePayment(@Param('paymentId') paymentId: string) {
    return this.service.removePayment(paymentId);
  }
}
