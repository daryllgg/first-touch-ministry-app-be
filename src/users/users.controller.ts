import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName } from './entities/role.enum';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { DeclineUserDto } from './dto/decline-user.dto';
import { User } from './entities/user.entity';
import { createMulterStorage, imageFileFilter } from '../common/multer-config';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Profile endpoints (non-parameterized, must be before :id routes) ──

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: User) {
    return this.usersService.findById(user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, ApprovedGuard)
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.requestProfileUpdate(user.id, dto);
  }

  @Patch('profile/picture')
  @UseGuards(JwtAuthGuard, ApprovedGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createMulterStorage('profile-pictures'),
      fileFilter: imageFileFilter,
    }),
  )
  uploadProfilePicture(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadProfilePicture(user.id, file);
  }

  // ── Profile change request endpoints (admin only) ──

  @Get('profile-changes/pending')
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  getPendingProfileChanges() {
    return this.usersService.findPendingProfileChanges();
  }

  @Patch('profile-changes/:id/approve')
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  approveProfileChange(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.usersService.approveProfileChange(id, admin);
  }

  @Patch('profile-changes/:id/reject')
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  rejectProfileChange(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.usersService.rejectProfileChange(id, admin);
  }

  // ── Existing admin endpoints ──

  @Post()
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUserByAdmin(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  findPending() {
    return this.usersService.findPendingUsers();
  }

  @Get('declined')
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  findDeclined() {
    return this.usersService.findDeclinedUsers();
  }

  @Get('member-names')
  getMemberNames() {
    return this.usersService.getMemberNames();
  }

  @Get('by-roles')
  @UseGuards(JwtAuthGuard, ApprovedGuard)
  findByRoles(@Query('roles') roles: string) {
    const roleNames = roles.split(',');
    return this.usersService.findByRoles(roleNames);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  approve(@Param('id') id: string) {
    return this.usersService.approveUser(id);
  }

  @Patch(':id/decline')
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  decline(@Param('id') id: string, @Body() dto: DeclineUserDto) {
    return this.usersService.declineUser(id, dto.reason);
  }

  @Post(':id/roles')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto.role);
  }

  @Delete(':id/roles/:role')
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  removeRole(@Param('id') id: string, @Param('role') role: string) {
    return this.usersService.removeRole(id, role as RoleName);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ApprovedGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
