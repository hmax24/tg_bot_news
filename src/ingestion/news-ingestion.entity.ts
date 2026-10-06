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
import { NewsIngestionStatus } from './enums/news-ingestion-status.enum';

@Entity('news_ingestions')
@Index(['articleId', 'collectionName'], { unique: true })
@Index(['collectionName', 'status', 'id'])
export class NewsIngestion {
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
        enum: NewsIngestionStatus,
        enumName: 'news_ingestion_status',
        default: NewsIngestionStatus.PENDING,
    })
    status: NewsIngestionStatus;

    @Column({
        name: 'chunk_count',
        type: 'integer',
        default: 0,
    })
    chunkCount: number;

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

    @Column({
        name: 'completed_at',
        type: 'timestamptz',
        nullable: true,
    })
    completedAt: Date | null;
}