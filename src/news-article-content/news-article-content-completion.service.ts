import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { NewsBroadcastService } from '../news-broadcast/news-broadcast.service';
import { NewsArticleContentRepository } from './news-article-content.repository';

@Injectable()
export class NewsArticleContentCompletionService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly repository: NewsArticleContentRepository,
        private readonly broadcastService: NewsBroadcastService,
    ) {}

    async complete(
        articleId: number,
        summary: string,
    ): Promise<void> {
        if (!Number.isSafeInteger(articleId) || articleId <= 0) {
            throw new Error('Некорректный ID статьи.');
        }

        const normalizedSummary: string = summary.trim();

        if (
            normalizedSummary.length === 0 ||
            normalizedSummary.length > 2000
        ) {
            throw new Error(
                'Пересказ должен содержать от 1 до 2000 символов.',
            );
        }

        await this.dataSource.transaction(
            async (manager: EntityManager): Promise<void> => {
                await this.repository.complete(
                    articleId,
                    normalizedSummary,
                    manager,
                );

                await this.broadcastService.createForArticle(
                    articleId,
                    manager,
                );
            },
        );
    }
}