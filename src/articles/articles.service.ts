import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { ArticleComment } from './entities/article-comment.entity';
import { ArticleLike } from './entities/article-like.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification-type.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private articlesRepo: Repository<Article>,
    @InjectRepository(ArticleComment)
    private commentsRepo: Repository<ArticleComment>,
    @InjectRepository(ArticleLike)
    private likesRepo: Repository<ArticleLike>,
    @Optional() private notificationsService?: NotificationsService,
    @Optional() private usersService?: UsersService,
  ) {}

  async create(
    dto: CreateArticleDto,
    author: User,
    images?: Express.Multer.File[],
  ): Promise<Article> {
    const imagePaths = images?.map(
      (file) => `article-images/${file.filename}`,
    );

    const article = this.articlesRepo.create({
      ...dto,
      status: dto.status || 'DRAFT',
      author,
      images: imagePaths || [],
    });

    const saved = await this.articlesRepo.save(article);

    // Handle @mentions
    if (dto.mentionedUserIds?.length && this.usersService) {
      try {
        const mentionedUsers: User[] = [];
        for (const uid of dto.mentionedUserIds) {
          const u = await this.usersService.findById(uid);
          if (u) mentionedUsers.push(u);
        }
        saved.mentionedUsers = mentionedUsers;
        await this.articlesRepo.save(saved);

        if (this.notificationsService && mentionedUsers.length > 0) {
          const mentionUserIds = mentionedUsers
            .filter((u) => u.id !== author.id)
            .map((u) => u.id);
          if (mentionUserIds.length > 0) {
            await this.notificationsService.createForMultipleUsers(
              mentionUserIds,
              NotificationType.ARTICLE,
              'You were mentioned',
              `${author.firstName} mentioned you in an article: ${saved.title}`,
              saved.id,
              'article',
            );
          }
        }
      } catch {
        // Mention handling is best-effort
      }
    }

    return saved;
  }

  async findAll(userId?: string): Promise<Article[]> {
    const qb = this.articlesRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.mentionedUsers', 'mentionedUsers')
      .orderBy('article.createdAt', 'DESC');

    if (userId) {
      qb.where(
        '(article.status = :published OR (article.status = :draft AND author.id = :userId))',
        { published: 'PUBLISHED', draft: 'DRAFT', userId },
      );
    } else {
      qb.where('article.status = :published', { published: 'PUBLISHED' });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Article> {
    const article = await this.articlesRepo.findOne({
      where: { id },
      relations: ['author', 'mentionedUsers'],
    });
    if (!article) {
      throw new NotFoundException(`Article with id ${id} not found`);
    }
    return article;
  }

  async update(
    id: string,
    dto: UpdateArticleDto,
    newImages?: Express.Multer.File[],
  ): Promise<Article> {
    const article = await this.findOne(id);

    // Handle removed images
    if (dto.removedImages?.length) {
      const removed = dto.removedImages;
      article.images = (article.images || []).filter(
        (img) => !removed.includes(img),
      );
    }

    // Handle new images
    if (newImages?.length) {
      const newPaths = newImages.map((f) => `article-images/${f.filename}`);
      article.images = [...(article.images || []), ...newPaths];
    }

    // Handle mention updates
    if (dto.mentionedUserIds && this.usersService) {
      const mentionedUsers: User[] = [];
      for (const uid of dto.mentionedUserIds) {
        const u = await this.usersService.findById(uid);
        if (u) mentionedUsers.push(u);
      }
      article.mentionedUsers = mentionedUsers;
    }

    // Apply other field updates
    if (dto.title) article.title = dto.title;
    if (dto.caption) article.caption = dto.caption;
    if (dto.status) article.status = dto.status;

    await this.articlesRepo.save(article);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const article = await this.findOne(id);
    await this.articlesRepo.remove(article);
  }

  // ─── Comments ───

  async createComment(
    articleId: string,
    content: string,
    user: User,
  ): Promise<ArticleComment> {
    const article = await this.findOne(articleId);
    const comment = this.commentsRepo.create({ content, author: user, article });
    return this.commentsRepo.save(comment);
  }

  async findComments(articleId: string): Promise<ArticleComment[]> {
    return this.commentsRepo.find({
      where: { article: { id: articleId } },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }

  async removeComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentsRepo.findOne({
      where: { id: commentId },
      relations: ['author'],
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.author.id !== userId)
      throw new ForbiddenException('Cannot delete this comment');
    await this.commentsRepo.remove(comment);
  }

  // ─── Likes ───

  async toggleLike(
    articleId: string,
    user: User,
  ): Promise<{ liked: boolean }> {
    await this.findOne(articleId);
    const existing = await this.likesRepo.findOne({
      where: { user: { id: user.id }, article: { id: articleId } },
    });
    if (existing) {
      await this.likesRepo.remove(existing);
      return { liked: false };
    }
    const like = this.likesRepo.create({
      user,
      article: { id: articleId } as Article,
    });
    await this.likesRepo.save(like);
    return { liked: true };
  }

  async getLikeStatus(
    articleId: string,
    userId: string,
  ): Promise<{ count: number; liked: boolean }> {
    const count = await this.likesRepo.count({
      where: { article: { id: articleId } },
    });
    const liked = await this.likesRepo.findOne({
      where: { user: { id: userId }, article: { id: articleId } },
    });
    return { count, liked: !!liked };
  }
}
