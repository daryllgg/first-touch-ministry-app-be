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
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
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

@Controller('articles')
@UseGuards(JwtAuthGuard, ApprovedGuard)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: createMulterStorage('article-images'),
      fileFilter: imageFileFilter,
    }),
  )
  create(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: User,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    // FormData sends arrays as strings
    if (typeof dto.mentionedUserIds === 'string') {
      dto.mentionedUserIds = JSON.parse(dto.mentionedUserIds);
    }
    return this.articlesService.create(dto, user, images);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.articlesService.findAll(user.id);
  }

  // ─── Comments ───

  @Post(':id/comments')
  createComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @CurrentUser() user: User,
  ) {
    return this.articlesService.createComment(id, content, user);
  }

  @Get(':id/comments')
  findComments(@Param('id') id: string) {
    return this.articlesService.findComments(id);
  }

  @Delete('comments/:commentId')
  removeComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: User,
  ) {
    return this.articlesService.removeComment(commentId, user.id);
  }

  // ─── Likes ───

  @Post(':id/like')
  toggleLike(@Param('id') id: string, @CurrentUser() user: User) {
    return this.articlesService.toggleLike(id, user);
  }

  @Get(':id/like-status')
  getLikeStatus(@Param('id') id: string, @CurrentUser() user: User) {
    return this.articlesService.getLikeStatus(id, user.id);
  }

  // ─── CRUD (generic :id routes last to avoid conflicts) ───

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: createMulterStorage('article-images'),
      fileFilter: imageFileFilter,
    }),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    if (typeof dto.mentionedUserIds === 'string') {
      dto.mentionedUserIds = JSON.parse(dto.mentionedUserIds);
    }
    if (typeof dto.removedImages === 'string') {
      dto.removedImages = JSON.parse(dto.removedImages);
    }
    return this.articlesService.update(id, dto, images);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.articlesService.remove(id);
  }
}
