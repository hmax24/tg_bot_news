import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import {NewsArticle} from '../news_article/news-article.entity';
import {NewsArticleContentStatus} from './enums/news-article-content-status.enum';

@Entity('news_article_contents')
@Index(['status', 'id'])
export class NewsArticleContent {
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
        name: 'full_text',
        type: 'text',
        nullable: true,
    })
    fullText: string | null;

    @Column({
        type: 'text',
        nullable: true,
    })
    summary: string | null;

    @Column({
        type: 'enum',
        enum: NewsArticleContentStatus,
        enumName: 'news_article_content_status',
        default: NewsArticleContentStatus.PENDING,
    })
    status: NewsArticleContentStatus;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
    })
    createdAt: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
    })
    updatedAt: Date;
}