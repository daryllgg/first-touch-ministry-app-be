import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from './entities/role.enum';
import { AssignRoleDto } from './dto/assign-role.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('pending')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  findPending() {
    return this.usersService.findPendingUsers();
  }

  @Patch(':id/approve')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  approve(@Param('id') id: string) {
    return this.usersService.approveUser(id);
  }

  @Post(':id/roles')
  @HttpCode(200)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto.role);
  }
}
