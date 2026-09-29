import {Injectable} from '@nestjs/common';
import {
    EntityManager,
    SelectQueryBuilder,
    Repository, IsNull, UpdateResult,
} from 'typeorm';

import {NewsArticleContent} from '../news-article-content/news-article-content.entity';
import {NewsArticleContentStatus} from '../news-article-content/enums/news-article-content-status.enum';
import {NewsSubscription} from '../news-subscription/news-subscription.entity';
import {NewsArticleIndex} from './news-article-index.entity';
import {NewsIndexingStatus} from './enums/news-indexing-status.enum';

@Injectable()
export class NewsArticleIndexRepository {
    async findNextUnindexedContent(
        collectionName: string,
        manager: EntityManager,
    ): Promise<NewsArticleContent | null> {
        const query: SelectQueryBuilder<NewsArticleContent> = manager
            .getRepository(NewsArticleContent)
            .createQueryBuilder('content');

        const subscribersQuery: SelectQueryBuilder<NewsSubscription> = query
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
            .where('articleTopic.news_article_id = content.articleId')
            .andWhere('subscription.isActive = :active')
            .andWhere('recipient.isActive = :active')
            .andWhere('topic.isActive = :active');

        const existingIndexQuery: SelectQueryBuilder<NewsArticleIndex> = query
            .subQuery()
            .select('1')
            .from(NewsArticleIndex, 'articleIndex')
            .where('articleIndex.articleId = content.articleId')
            .andWhere('articleIndex.collectionName = :collectionName');

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
            .andWhere(`NOT EXISTS ${existingIndexQuery.getQuery()}`)
            .setParameters({
                active: true,
                collectionName,
            })
            .orderBy('content.id', 'ASC')
            .take(1)
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
            .into(NewsArticleIndex)
            .values({
                articleId,
                collectionName,
                summaryHash,
                status: NewsIndexingStatus.PENDING,
                embedding: null,
            })
            .orIgnore()
            .execute();
    }

    async claimNextPending(
        collectionName: string,
        manager: EntityManager,
    ): Promise<NewsArticleIndex | null> {
        return manager.transaction(
            async (
                transactionManager: EntityManager,
            ): Promise<NewsArticleIndex | null> => {
                const repository: Repository<NewsArticleIndex> =
                    transactionManager.getRepository(NewsArticleIndex);

                const query: SelectQueryBuilder<NewsArticleIndex> =
                    repository.createQueryBuilder('articleIndex');

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
                            'articleTopic.news_article_id = articleIndex.articleId',
                        )
                        .andWhere('subscription.isActive = :active')
                        .andWhere('recipient.isActive = :active')
                        .andWhere('topic.isActive = :active');

                const job: NewsArticleIndex | null = await query
                    .innerJoin(
                        NewsArticleContent,
                        'content',
                        'content.articleId = articleIndex.articleId',
                    )
                    .where('articleIndex.collectionName = :collectionName', {
                        collectionName,
                    })
                    .andWhere('articleIndex.status = :indexStatus', {
                        indexStatus: NewsIndexingStatus.PENDING,
                    })
                    .andWhere('content.status = :contentStatus', {
                        contentStatus: NewsArticleContentStatus.COMPLETED,
                    })
                    .andWhere('content.summary IS NOT NULL')
                    .andWhere("BTRIM(content.summary) <> ''")
                    .andWhere(`EXISTS ${subscribersQuery.getQuery()}`)
                    .setParameter('active', true)
                    .orderBy('articleIndex.id', 'ASC')
                    .limit(1)
                    .setLock(
                        'pessimistic_write',
                        undefined,
                        ['"articleIndex"'],
                    )
                    .setOnLocked('skip_locked')
                    .getOne();

                if (job === null) {
                    return null;
                }

                await repository.update(
                    {
                        id: job.id,
                        status: NewsIndexingStatus.PENDING,
                    },
                    {
                        status: NewsIndexingStatus.PROCESSING,
                    },
                );

                job.status = NewsIndexingStatus.PROCESSING;

                return job;
            },
        );
    }

    async saveEmbedding(
        jobId: number,
        summaryHash: string,
        embedding: number[],
        manager: EntityManager,
    ): Promise<void> {
        if (
            embedding.length === 0 ||
            !embedding.every(
                (value: number): boolean => Number.isFinite(value),
            ) ||
            !embedding.some(
                (value: number): boolean => value !== 0,
            )
        ) {
            throw new Error('Нельзя сохранить некорректный embedding.');
        }

        const repository: Repository<NewsArticleIndex> =
            manager.getRepository(NewsArticleIndex);

        const result: UpdateResult = await repository.update(
            {
                id: jobId,
                status: NewsIndexingStatus.PROCESSING,
                summaryHash,
                embedding: IsNull(),
            },
            {
                embedding,
            },
        );

        if (result.affected !== 1) {
            throw new Error(
                `Не удалось сохранить embedding для задания ${jobId}: ` +
                'изменилось состояние задания или вектор уже сохранён.',
            );
        }
    }

    async complete(
        jobId: number,
        summaryHash: string,
        manager: EntityManager,
    ): Promise<void> {
        const repository: Repository<NewsArticleIndex> =
            manager.getRepository(NewsArticleIndex);

        const result: UpdateResult = await repository
            .createQueryBuilder()
            .update(NewsArticleIndex)
            .set({
                status: NewsIndexingStatus.COMPLETED,
                embedding: null,
            })
            .where({
                id: jobId,
                status: NewsIndexingStatus.PROCESSING,
                summaryHash,
            })
            .andWhere('"embedding" IS NOT NULL')
            .execute();

        if (result.affected !== 1) {
            throw new Error(
                `Не удалось завершить задание индексации ${jobId}: ` +
                'изменилось состояние задания или отсутствует embedding.',
            );
        }
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
}