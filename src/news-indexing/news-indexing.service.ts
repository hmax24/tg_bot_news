import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';

import { NewsArticleContent } from '../news-article-content/news-article-content.entity';
import { NewsArticleIndexRepository } from './news-article-index.repository';

@Injectable()
export class NewsIndexingService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        private readonly indexRepository: NewsArticleIndexRepository,
    ) {}

    async prepareNext(): Promise<number | null> {
        const collectionName: string = this.configService
            .getOrThrow<string>('QDRANT_COLLECTION')
            .trim();

        if (
            collectionName.length > 255 ||
            !/^[a-zA-Z0-9_-]+$/.test(collectionName)
        ) {
            throw new Error('Некорректное название QDRANT_COLLECTION.');
        }

        return this.dataSource.transaction(
            async (manager: EntityManager): Promise<number | null> => {
                const content: NewsArticleContent | null =
                    await this.indexRepository.findNextUnindexedContent(
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

                const embeddingInput: string =
                    `title: none | text: ${summary}`;

                const summaryHash: string = createHash('sha256')
                    .update(embeddingInput, 'utf8')
                    .digest('hex');

                await this.indexRepository.createPending(
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