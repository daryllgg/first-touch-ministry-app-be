import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ArticleComment } from './article-comment.entity';
import { ArticleLike } from './article-like.entity';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  caption: string;

  @Column({ type: 'varchar', default: 'PUBLISHED' })
  status: string;

  @ManyToOne(() => User, { eager: true })
  author: User;

  @Column('simple-array', { nullable: true })
  images: string[];

  @ManyToMany(() => User)
  @JoinTable()
  mentionedUsers: User[];

  @OneToMany(() => ArticleComment, (c) => c.article)
  comments: ArticleComment[];

  @OneToMany(() => ArticleLike, (l) => l.article)
  likes: ArticleLike[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
