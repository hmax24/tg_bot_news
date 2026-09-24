import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { NewsArticleContent } from './news-article-content.entity';
import { NewsArticleContentRepository } from './news-article-content.repository';
import { NewsArticleContentLoader } from './news-article-content-loader.service';
import { NewsArticleSummaryService } from './news-article-summary.service';
import {NewsArticleContentCompletionService} from "./news-article-content-completion.service";

@Injectable()
export class NewsArticleContentProcessor {
    private readonly logger: Logger =
        new Logger(NewsArticleContentProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly repository: NewsArticleContentRepository,
        private readonly loader: NewsArticleContentLoader,
        private readonly summaryService: NewsArticleSummaryService,
        private readonly completionService: NewsArticleContentCompletionService,
    ) {}

    async processNext(): Promise<boolean> {
        const articleId: number | null =
            await this.repository.findNextPendingArticleId(
                this.dataSource.manager,
            );

        if (articleId === null) {
            return false;
        }

        return this.processArticle(articleId);
    }

    async processArticle(articleId: number): Promise<boolean> {
        if (!Number.isSafeInteger(articleId) || articleId <= 0) {
            throw new Error('Некорректный ID статьи.');
        }

        const claimed: boolean = await this.repository.claimPending(
            articleId,
            this.dataSource.manager,
        );

        if (!claimed) {
            return false;
        }

        try {
            await this.loader.loadForArticle(articleId);

            const content: NewsArticleContent | null =
                await this.repository.findByArticleId(
                    articleId,
                    this.dataSource.manager,
                );

            if (
                content === null ||
                content.fullText === null ||
                content.fullText.trim().length === 0
            ) {
                throw new Error(
                    `Полный текст статьи ${articleId} отсутствует.`,
                );
            }

            const summary: string =
                await this.summaryService.summarize(content.fullText);

            await this.completionService.complete(articleId, summary);

            this.logger.log(
                `Article processing completed: articleId=${articleId}`,
            );

            return true;
        } catch (error: unknown) {
            try {
                await this.repository.markFailed(
                    articleId,
                    this.dataSource.manager,
                );
            } catch {
                this.logger.error(
                    `Failed to save FAILED status: articleId=${articleId}`,
                );
            }

            this.logger.error(
                `Article processing failed: articleId=${articleId}`,
            );

            throw error;
        }
    }
}