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
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { YouthProfilesService } from './youth-profiles.service';
import { CreateYouthProfileDto } from './dto/create-youth-profile.dto';
import { UpdateYouthProfileDto } from './dto/update-youth-profile.dto';
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

const photoStorage = createMulterStorage('youth-photos');

@Controller('youth-profiles')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class YouthProfilesController {
  constructor(private readonly youthProfilesService: YouthProfilesService) {}

  // Station endpoints — placed BEFORE :id routes
  @Get('stations')
  findAllStations() {
    return this.youthProfilesService.findAllStations();
  }

  @Post('stations')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  createStation(@Body() body: { name: string }) {
    return this.youthProfilesService.createStation(body.name);
  }

  @Delete('stations/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  deleteStation(@Param('id') id: string) {
    return this.youthProfilesService.deleteStation(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(
    RoleName.PASTOR,
    RoleName.LEADER,
    RoleName.OUTREACH_WORKER,
    RoleName.ADMIN,
    RoleName.SUPER_ADMIN,
  )
  @UseInterceptors(FileInterceptor('photo', { storage: photoStorage }))
  create(
    @Body() dto: CreateYouthProfileDto,
    @UploadedFile() photo: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.youthProfilesService.create(dto, photo || null, user);
  }

  @Get()
  findAll() {
    return this.youthProfilesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.youthProfilesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(
    RoleName.PASTOR,
    RoleName.LEADER,
    RoleName.OUTREACH_WORKER,
    RoleName.ADMIN,
    RoleName.SUPER_ADMIN,
  )
  @UseInterceptors(FileInterceptor('photo', { storage: photoStorage }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateYouthProfileDto,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    return this.youthProfilesService.update(id, dto, photo);
  }

  @Patch(':id/photo')
  @UseGuards(RolesGuard)
  @Roles(
    RoleName.PASTOR,
    RoleName.LEADER,
    RoleName.OUTREACH_WORKER,
    RoleName.ADMIN,
    RoleName.SUPER_ADMIN,
  )
  @UseInterceptors(FileInterceptor('photo', { storage: photoStorage }))
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    return this.youthProfilesService.uploadPhoto(id, photo);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.youthProfilesService.remove(id);
  }
}
