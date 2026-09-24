import {Injectable} from '@nestjs/common';
import {EntityManager, InsertResult, Repository} from 'typeorm';
import {NewsArticle} from './news-article.entity';
import {InjectRepository} from '@nestjs/typeorm';
import {NewsArticleContentStatus} from "../news-article-content/enums/news-article-content-status.enum";
import {NewsArticleContent} from "../news-article-content/news-article-content.entity";

@Injectable()
export class NewsArticlesRepository {
    constructor(
        @InjectRepository(NewsArticle)
        private readonly repository: Repository<NewsArticle>,
    ) {
    }

    async findLatestByTopicIds(topicIds: number[]): Promise<NewsArticle[]> {
        if (topicIds.length === 0) {
            return [];
        }

        return this.repository
            .createQueryBuilder('article')
            .innerJoin('article.topics', 'subscriptionTopic')
            .leftJoinAndSelect('article.topics', 'articleTopic')
            .where('subscriptionTopic.id IN (:...topicIds)', {
                topicIds,
            })
            .andWhere('subscriptionTopic.isActive = :isActive', {
                isActive: true,
            })
            .distinct(true)
            .orderBy('article.publishedAt', 'DESC')
            .addOrderBy('article.id', 'DESC')
            .take(5)
            .getMany();
    }

    async saveImported(
        article: NewsArticle,
        manager: EntityManager,
    ): Promise<NewsArticle | null> {
        const repository: Repository<NewsArticle> =
            manager.getRepository(NewsArticle);

        const result: InsertResult = await repository
            .createQueryBuilder()
            .insert()
            .values({
                title: article.title,
                description: article.description,
                url: article.url,
                sourceName: article.sourceName,
                sourceArticleId: article.sourceArticleId,
                publishedAt: article.publishedAt,
            })
            .orIgnore()
            .returning(['id'])
            .execute();

        const insertedRows: unknown = result.raw;

        const created: boolean =
            Array.isArray(insertedRows) && insertedRows.length > 0;

        if (!created) {
            return null;
        }

        return repository.findOneByOrFail({
            url: article.url,
        });
    }

    async addTopics(
        articleId: number,
        topicIds: number[],
        manager: EntityManager,
    ): Promise<void> {
        if (topicIds.length === 0) {
            return;
        }

        await manager
            .createQueryBuilder()
            .relation(NewsArticle, 'topics')
            .of(articleId)
            .add(topicIds);
    }

    async findLatestSummariesByTopicIds(
        topicIds: number[],
    ): Promise<NewsArticleContent[]> {
        if (topicIds.length === 0) {
            return [];
        }

        return this.repository.manager
            .getRepository(NewsArticleContent)
            .createQueryBuilder('content')
            .innerJoinAndSelect('content.article', 'article')
            .innerJoin('article.topics', 'subscriptionTopic')
            .leftJoinAndSelect('article.topics', 'articleTopic')
            .where('subscriptionTopic.id IN (:...topicIds)', {
                topicIds,
            })
            .andWhere('subscriptionTopic.isActive = :isActive', {
                isActive: true,
            })
            .andWhere('content.status = :status', {
                status: NewsArticleContentStatus.COMPLETED,
            })
            .andWhere('content.summary IS NOT NULL')
            .andWhere("BTRIM(content.summary) <> ''")
            .distinct(true)
            .orderBy('article.publishedAt', 'DESC')
            .addOrderBy('article.id', 'DESC')
            .take(5)
            .getMany();
    }
}
