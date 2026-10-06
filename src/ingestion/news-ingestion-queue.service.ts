import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';

import { NewsArticleContent } from '../news-article-content/news-article-content.entity';
import { NewsIngestionRepository } from './news-ingestion.repository';

@Injectable()
export class NewsIngestionQueueService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        private readonly repository: NewsIngestionRepository,
    ) {}

    async prepareNext(): Promise<number | null> {
        const collectionName: string = this.configService
            .getOrThrow<string>('QDRANT_CHUNKS_COLLECTION')
            .trim();

        const summaryCollectionName: string = this.configService
            .getOrThrow<string>('QDRANT_COLLECTION')
            .trim();

        if (
            collectionName.length > 255 ||
            !/^[a-zA-Z0-9_-]+$/.test(collectionName)
        ) {
            throw new Error('Некорректный QDRANT_CHUNKS_COLLECTION.');
        }

        if (collectionName === summaryCollectionName) {
            throw new Error(
                'Для чанков нужна отдельная коллекция Qdrant.',
            );
        }

        return this.dataSource.transaction(
            async (manager: EntityManager): Promise<number | null> => {
                const content: NewsArticleContent | null =
                    await this.repository.findNextContent(
                        collectionName,
                        manager,
                    );

                if (content === null) {
                    return null;
                }

                const summary: string = content.summary?.trim() ?? '';

                if (summary.length === 0) {
                    throw new Error(
                        `У статьи ${content.articleId} отсутствует пересказ.`,
                    );
                }

                const summaryHash: string = createHash('sha256')
                    .update(summary, 'utf8')
                    .digest('hex');

                await this.repository.createPending(
                    content.articleId,
                    collectionName,
                    summaryHash,
                    manager,
                );

                return content.articleId;
            },
        );
    }
}