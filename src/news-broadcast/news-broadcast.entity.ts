import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { NewsArticle } from '../news_article/news-article.entity';
import { NewsBroadcastStatus } from './enums/news-broadcast-status.enum';

@Entity('news_broadcasts')
@Index(['status', 'id'])
export class NewsBroadcast {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'article_id',
    type: 'integer',
  })
  articleId: number;

  @OneToOne((): typeof NewsArticle => NewsArticle, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'article_id',
    referencedColumnName: 'id',
  })
  article: NewsArticle;

  @Column({
    type: 'enum',
    enum: NewsBroadcastStatus,
    enumName: 'news_broadcast_status',
    default: NewsBroadcastStatus.PENDING,
  })
  status: NewsBroadcastStatus;

  @Column({
    name: 'max_recipient_user_id',
    type: 'integer',
  })
  maxRecipientUserId: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @Column({
    name: 'completed_at',
    type: 'timestamptz',
    nullable: true,
  })
  completedAt: Date | null;
}
