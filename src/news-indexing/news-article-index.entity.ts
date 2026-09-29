import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { NewsArticle } from '../news_article/news-article.entity';
import { NewsIndexingStatus } from './enums/news-indexing-status.enum';

@Entity('news_article_indexes')
@Index(['articleId', 'collectionName'], { unique: true })
@Index(['collectionName', 'status', 'id'])
export class NewsArticleIndex {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'article_id',
        type: 'integer',
    })
    articleId: number;

    @ManyToOne((): typeof NewsArticle => NewsArticle, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({
        name: 'article_id',
        referencedColumnName: 'id',
    })
    article: NewsArticle;

    @Column({
        name: 'collection_name',
        type: 'varchar',
        length: 255,
    })
    collectionName: string;

    @Column({
        name: 'summary_hash',
        type: 'varchar',
        length: 64,
    })
    summaryHash: string;

    @Column({
        type: 'enum',
        enum: NewsIndexingStatus,
        enumName: 'news_indexing_status',
        default: NewsIndexingStatus.PENDING,
    })
    status: NewsIndexingStatus;

    @Column({
        type: 'real',
        array: true,
        nullable: true,
    })
    embedding: number[] | null;

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