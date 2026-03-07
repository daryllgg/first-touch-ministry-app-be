import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { GivingProgramsService } from './giving-programs.service';
import { CreateGivingProgramDto } from './dto/create-giving-program.dto';
import { UpdateGivingProgramDto } from './dto/update-giving-program.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName } from '../users/entities/role.enum';
import { User } from '../users/entities/user.entity';

@Controller('giving-programs')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class GivingProgramsController {
  constructor(private readonly service: GivingProgramsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  create(@Body() dto: CreateGivingProgramDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('active')
  findActive() {
    return this.service.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateGivingProgramDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
