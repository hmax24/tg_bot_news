import { Injectable } from '@nestjs/common';
import {
    EntityManager,
    SelectQueryBuilder,
    Repository,
    UpdateResult,
} from 'typeorm';

import { NewsArticleContent } from '../news-article-content/news-article-content.entity';
import { NewsArticleContentStatus } from '../news-article-content/enums/news-article-content-status.enum';
import { NewsSubscription } from '../news-subscription/news-subscription.entity';
import { NewsIngestion } from './news-ingestion.entity';
import { NewsIngestionStatus } from './enums/news-ingestion-status.enum';

@Injectable()
export class NewsIngestionRepository {
    async findNextContent(
        collectionName: string,
        manager: EntityManager,
    ): Promise<NewsArticleContent | null> {
        const query: SelectQueryBuilder<NewsArticleContent> = manager
            .getRepository(NewsArticleContent)
            .createQueryBuilder('content');

        const subscribersQuery: SelectQueryBuilder<NewsSubscription> =
            query
                .subQuery()
                .select('1')
                .from(NewsSubscription, 'subscription')
                .innerJoin('subscription.telegramUser', 'recipient')
                .innerJoin('subscription.newsTopics', 'topic')
                .innerJoin(
                    'news_article_topics',
                    'articleTopic',
                    'articleTopic.news_topic_id = topic.id',
                )
                .where(
                    'articleTopic.news_article_id = content.articleId',
                )
                .andWhere('subscription.isActive = :active')
                .andWhere('recipient.isActive = :active')
                .andWhere('topic.isActive = :active');

        const existingJobQuery: SelectQueryBuilder<NewsIngestion> =
            query
                .subQuery()
                .select('1')
                .from(NewsIngestion, 'ingestion')
                .where('ingestion.articleId = content.articleId')
                .andWhere(
                    'ingestion.collectionName = :collectionName',
                );

        return query
            .select([
                'content.id',
                'content.articleId',
                'content.summary',
            ])
            .where('content.status = :contentStatus', {
                contentStatus: NewsArticleContentStatus.COMPLETED,
            })
            .andWhere('content.summary IS NOT NULL')
            .andWhere("BTRIM(content.summary) <> ''")
            .andWhere(`EXISTS ${subscribersQuery.getQuery()}`)
            .andWhere(`NOT EXISTS ${existingJobQuery.getQuery()}`)
            .setParameters({
                active: true,
                collectionName,
            })
            .orderBy('content.id', 'ASC')
            .limit(1)
            .getOne();
    }

    async createPending(
        articleId: number,
        collectionName: string,
        summaryHash: string,
        manager: EntityManager,
    ): Promise<void> {
        await manager
            .createQueryBuilder()
            .insert()
            .into(NewsIngestion)
            .values({
                articleId,
                collectionName,
                summaryHash,
                status: NewsIngestionStatus.PENDING,
                chunkCount: 0,
                completedAt: null,
            })
            .orIgnore()
            .execute();
    }

    async claimNextPending(
        collectionName: string,
        manager: EntityManager,
    ): Promise<NewsIngestion | null> {
        return manager.transaction(
            async (
                transactionManager: EntityManager,
            ): Promise<NewsIngestion | null> => {
                const repository: Repository<NewsIngestion> =
                    transactionManager.getRepository(NewsIngestion);

                const query: SelectQueryBuilder<NewsIngestion> =
                    repository.createQueryBuilder('ingestion');

                const subscribersQuery: SelectQueryBuilder<NewsSubscription> =
                    query
                        .subQuery()
                        .select('1')
                        .from(NewsSubscription, 'subscription')
                        .innerJoin('subscription.telegramUser', 'recipient')
                        .innerJoin('subscription.newsTopics', 'topic')
                        .innerJoin(
                            'news_article_topics',
                            'articleTopic',
                            'articleTopic.news_topic_id = topic.id',
                        )
                        .where(
                            'articleTopic.news_article_id = ingestion.articleId',
                        )
                        .andWhere('subscription.isActive = :active')
                        .andWhere('recipient.isActive = :active')
                        .andWhere('topic.isActive = :active');

                const job: NewsIngestion | null = await query
                    .innerJoin(
                        NewsArticleContent,
                        'content',
                        'content.articleId = ingestion.articleId',
                    )
                    .where('ingestion.collectionName = :collectionName', {
                        collectionName,
                    })
                    .andWhere('ingestion.status = :ingestionStatus', {
                        ingestionStatus: NewsIngestionStatus.PENDING,
                    })
                    .andWhere('content.status = :contentStatus', {
                        contentStatus: NewsArticleContentStatus.COMPLETED,
                    })
                    .andWhere('content.summary IS NOT NULL')
                    .andWhere("BTRIM(content.summary) <> ''")
                    .andWhere(`EXISTS ${subscribersQuery.getQuery()}`)
                    .setParameter('active', true)
                    .orderBy('ingestion.id', 'ASC')
                    .limit(1)
                    .setLock(
                        'pessimistic_write',
                        undefined,
                        ['"ingestion"'],
                    )
                    .setOnLocked('skip_locked')
                    .getOne();

                if (job === null) {
                    return null;
                }

                const result: UpdateResult = await repository.update(
                    {
                        id: job.id,
                        status: NewsIngestionStatus.PENDING,
                    },
                    {
                        status: NewsIngestionStatus.PROCESSING,
                    },
                );

                if (result.affected !== 1) {
                    throw new Error(
                        `Не удалось получить задание ingestion ${job.id}.`,
                    );
                }

                job.status = NewsIngestionStatus.PROCESSING;

                return job;
            },
        );
    }

    async findCompletedSummary(
        articleId: number,
        manager: EntityManager,
    ): Promise<string | null> {
        const content: NewsArticleContent | null = await manager
            .getRepository(NewsArticleContent)
            .findOne({
                select: {
                    id: true,
                    summary: true,
                },
                where: {
                    articleId,
                    status: NewsArticleContentStatus.COMPLETED,
                },
            });

        return content?.summary?.trim() || null;
    }

    async complete(
        jobId: number,
        summaryHash: string,
        chunkCount: number,
        manager: EntityManager,
    ): Promise<void> {
        if (
            !Number.isSafeInteger(chunkCount) ||
            chunkCount <= 0
        ) {
            throw new Error(
                'Количество записанных чанков должно быть положительным целым числом.',
            );
        }

        const repository: Repository<NewsIngestion> =
            manager.getRepository(NewsIngestion);

        const result: UpdateResult = await repository.update(
            {
                id: jobId,
                status: NewsIngestionStatus.PROCESSING,
                summaryHash,
            },
            {
                status: NewsIngestionStatus.COMPLETED,
                chunkCount,
                completedAt: new Date(),
            },
        );

        if (result.affected !== 1) {
            throw new Error(
                `Не удалось завершить задание ingestion ${jobId}: ` +
                'состояние задания изменилось.',
            );
        }
    }

    async markFailed(
        jobId: number,
        summaryHash: string,
        manager: EntityManager,
    ): Promise<void> {
        const repository: Repository<NewsIngestion> =
            manager.getRepository(NewsIngestion);

        const result: UpdateResult = await repository.update(
            {
                id: jobId,
                status: NewsIngestionStatus.PROCESSING,
                summaryHash,
            },
            {
                status: NewsIngestionStatus.FAILED,
            },
        );

        if (result.affected !== 1) {
            throw new Error(
                `Не удалось отметить ошибку задания ingestion ${jobId}: ` +
                'состояние задания изменилось.',
            );
        }
    }
}