import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { DevToClient } from '../news_article/sources/dev-to/dev-to-client';
import type { DevToArticleDetails } from '../news_article/sources/dev-to/dev-to-article-details';
import type { NewsArticleContent } from './news-article-content.entity';
import { NewsArticleContentRepository } from './news-article-content.repository';

@Injectable()
export class NewsArticleContentLoader {
    constructor(
        private readonly dataSource: DataSource,
        private readonly repository: NewsArticleContentRepository,
        private readonly devToClient: DevToClient,
    ) {}

    async loadForArticle(articleId: number): Promise<void> {
        if (!Number.isSafeInteger(articleId) || articleId <= 0) {
            throw new Error('Некорректный ID статьи.');
        }

        const content: NewsArticleContent | null =
            await this.repository.findByArticleId(
                articleId,
                this.dataSource.manager,
            );

        if (content === null) {
            throw new Error(
                `Запись обработки статьи ${articleId} не найдена.`,
            );
        }

        if (content.fullText !== null) {
            return;
        }

        if (content.article.sourceName !== 'dev.to') {
            throw new Error(
                `Источник статьи ${articleId} не поддерживается.`,
            );
        }

        const sourceArticleId: number | null =
            content.article.sourceArticleId;

        if (
            sourceArticleId === null ||
            !Number.isSafeInteger(sourceArticleId) ||
            sourceArticleId <= 0
        ) {
            throw new Error(
                `У статьи ${articleId} отсутствует корректный ID DEV.to.`,
            );
        }

        const details: DevToArticleDetails =
            await this.devToClient.getArticleById(sourceArticleId);

        const fullText: string = details.body_markdown.trim();

        await this.repository.saveFullTextIfMissing(
            content.id,
            fullText,
            this.dataSource.manager,
        );
    }
}