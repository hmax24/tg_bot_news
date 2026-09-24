import { Injectable } from '@nestjs/common';
import {EntityManager, IsNull, Repository, UpdateResult} from 'typeorm';

import { NewsArticleContent } from './news-article-content.entity';
import { NewsArticleContentStatus } from './enums/news-article-content-status.enum';

@Injectable()
export class NewsArticleContentRepository {
    async createPending(
        articleId: number,
        manager: EntityManager,
    ): Promise<void> {
        const repository: Repository<NewsArticleContent> =
            manager.getRepository(NewsArticleContent);

        await repository.insert({
            articleId,
            status: NewsArticleContentStatus.PENDING,
            fullText: null,
            summary: null,
        });

    }

    async findByArticleId(
        articleId: number,
        manager: EntityManager,
    ): Promise<NewsArticleContent | null> {
        const repository: Repository<NewsArticleContent> =
            manager.getRepository(NewsArticleContent);

        return repository.findOne({
            where: { articleId },
            relations: { article: true },
        });
    }

    async saveFullTextIfMissing(
        contentId: number,
        fullText: string,
        manager: EntityManager,
    ): Promise<void> {
        const repository: Repository<NewsArticleContent> =
            manager.getRepository(NewsArticleContent);

        await repository.update(
            {
                id: contentId,
                fullText: IsNull(),
            },
            {
                fullText,
            },
        );
    }

    async claimPending(
        articleId: number,
        manager: EntityManager,
    ): Promise<boolean> {
        const repository: Repository<NewsArticleContent> =
            manager.getRepository(NewsArticleContent);

        const result: UpdateResult = await repository.update(
            {
                articleId,
                status: NewsArticleContentStatus.PENDING,
            },
            {
                status: NewsArticleContentStatus.PROCESSING,
            },
        );

        return result.affected === 1;
    }

    async complete(
        articleId: number,
        summary: string,
        manager: EntityManager,
    ): Promise<void> {
        const repository: Repository<NewsArticleContent> =
            manager.getRepository(NewsArticleContent);

        const result: UpdateResult = await repository.update(
            {
                articleId,
                status: NewsArticleContentStatus.PROCESSING,
            },
            {
                summary,
                status: NewsArticleContentStatus.COMPLETED,
            },
        );

        if (result.affected !== 1) {
            throw new Error(
                `Не удалось завершить обработку статьи ${articleId}.`,
            );
        }
    }

    async markFailed(
        articleId: number,
        manager: EntityManager,
    ): Promise<void> {
        const repository: Repository<NewsArticleContent> =
            manager.getRepository(NewsArticleContent);

        await repository.update(
            {
                articleId,
                status: NewsArticleContentStatus.PROCESSING,
            },
            {
                status: NewsArticleContentStatus.FAILED,
            },
        );
    }

    async findNextPendingArticleId(
        manager: EntityManager,
    ): Promise<number | null> {
        const repository: Repository<NewsArticleContent> =
            manager.getRepository(NewsArticleContent);

        const content: NewsArticleContent | null =
            await repository.findOne({
                where: {
                    status: NewsArticleContentStatus.PENDING,
                },
                select: {
                    id: true,
                    articleId: true,
                },
                order: {
                    id: 'ASC',
                },
            });

        return content?.articleId ?? null;
    }

}