import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './entities/article.entity';
import { ArticleComment } from './entities/article-comment.entity';
import { ArticleLike } from './entities/article-like.entity';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, ArticleComment, ArticleLike]),
    NotificationsModule,
    UsersModule,
  ],
  providers: [ArticlesService],
  controllers: [ArticlesController],
  exports: [ArticlesService],
})
export class ArticlesModule {}
