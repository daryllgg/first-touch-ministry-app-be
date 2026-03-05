import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName } from '../users/entities/role.enum';
import { User } from '../users/entities/user.entity';
import {
  createMulterStorage,
  imageFileFilter,
} from '../common/multer-config';

@Controller('announcements')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.LEADER, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: createMulterStorage('announcement-images'),
      fileFilter: imageFileFilter,
    }),
  )
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: User,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    // FormData sends arrays as strings
    if (typeof dto.mentionedUserIds === 'string') {
      dto.mentionedUserIds = JSON.parse(dto.mentionedUserIds);
    }
    return this.announcementsService.create(dto, user, images);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    const userRoles = user.roles?.map((r) => r.name) || [];
    return this.announcementsService.findAll(userRoles);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.PASTOR, RoleName.LEADER, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(id);
  }
}
