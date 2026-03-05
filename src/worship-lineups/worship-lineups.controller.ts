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
import { WorshipLineupsService } from './worship-lineups.service';
import { CreateWorshipLineupDto } from './dto/create-worship-lineup.dto';
import { UpdateLineupStatusDto } from './dto/update-lineup-status.dto';
import { RequestChangesDto } from './dto/request-changes.dto';
import { CreateSubstitutionRequestDto } from './dto/create-substitution-request.dto';
import { UpdateSubstitutionStatusDto } from './dto/update-substitution-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName } from '../users/entities/role.enum';
import { User } from '../users/entities/user.entity';

@Controller('worship-lineups')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class WorshipLineupsController {
  constructor(private readonly worshipLineupsService: WorshipLineupsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.WORSHIP_LEADER, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  create(@Body() dto: CreateWorshipLineupDto, @CurrentUser() user: User) {
    return this.worshipLineupsService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.worshipLineupsService.findForUser(user.id);
  }

  @Get('instrument-roles')
  findInstrumentRoles() {
    return this.worshipLineupsService.findInstrumentRoles();
  }

  @Post('instrument-roles')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  createInstrumentRole(@Body() body: { name: string }) {
    return this.worshipLineupsService.createInstrumentRole(body.name);
  }

  @Delete('instrument-roles/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  deleteInstrumentRole(@Param('id') id: string) {
    return this.worshipLineupsService.deleteInstrumentRole(id);
  }

  @Post('substitutions')
  createSubstitutionRequest(
    @Body() dto: CreateSubstitutionRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.worshipLineupsService.createSubstitutionRequest(dto, user);
  }

  @Patch('substitutions/:id/status')
  @UseGuards(RolesGuard)
  @Roles(RoleName.WORSHIP_TEAM_HEAD, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  updateSubstitutionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSubstitutionStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.worshipLineupsService.updateSubstitutionStatus(id, dto.status, user);
  }

  @Patch('substitutions/:id/accept')
  acceptSubstitution(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.worshipLineupsService.acceptSubstitution(id, user);
  }

  @Get(':id/substitutions')
  findSubstitutionRequests(@Param('id') id: string) {
    return this.worshipLineupsService.findSubstitutionRequests(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.worshipLineupsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(RoleName.WORSHIP_TEAM_HEAD, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLineupStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.worshipLineupsService.updateStatus(id, dto.status, user, dto.comment);
  }

  @Patch(':id/resubmit')
  resubmit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.worshipLineupsService.resubmit(id, user);
  }

  @Patch(':id')
  updateLineup(
    @Param('id') id: string,
    @Body() dto: CreateWorshipLineupDto,
    @CurrentUser() user: User,
  ) {
    return this.worshipLineupsService.update(id, dto, user);
  }

  @Patch(':id/request-changes')
  @UseGuards(RolesGuard)
  @Roles(RoleName.WORSHIP_TEAM_HEAD, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  requestChanges(
    @Param('id') id: string,
    @Body() dto: RequestChangesDto,
    @CurrentUser() user: User,
  ) {
    return this.worshipLineupsService.requestChanges(id, dto.comment, user);
  }
}
