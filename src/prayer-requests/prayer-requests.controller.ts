import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrayerRequestsService } from './prayer-requests.service';
import { CreatePrayerRequestDto } from './dto/create-prayer-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovedGuard } from '../auth/guards/approved.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { RoleName } from '../users/entities/role.enum';
import {
  createMulterStorage,
  imageFileFilter,
} from '../common/multer-config';

@Controller('prayer-requests')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class PrayerRequestsController {
  constructor(
    private readonly prayerRequestsService: PrayerRequestsService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: createMulterStorage('prayer-request-images'),
      fileFilter: imageFileFilter,
    }),
  )
  create(
    @Body() dto: CreatePrayerRequestDto,
    @CurrentUser() user: User,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.prayerRequestsService.create(dto, user, image);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.prayerRequestsService.findAll(user);
  }

  /** Must be defined BEFORE :id so 'pending' is not interpreted as a UUID param */
  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.PASTOR)
  findPending() {
    return this.prayerRequestsService.findPending();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prayerRequestsService.findOne(id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.PASTOR)
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.prayerRequestsService.approve(id, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.prayerRequestsService.remove(id, user);
  }
}
