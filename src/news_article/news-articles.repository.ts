import {Injectable} from '@nestjs/common';
import {EntityManager, Repository} from 'typeorm';
import {NewsArticle} from './news-article.entity';
import {InjectRepository} from "@nestjs/typeorm";

@Injectable()
export class NewsArticlesRepository {

    constructor(
        @InjectRepository(NewsArticle)
        private readonly repository: Repository<NewsArticle>,
    ) {
    }

    async findLatestByTopicIds(
        topicIds: number[],
    ): Promise<NewsArticle[]> {
        if (topicIds.length === 0) {
            return [];
        }

        return this.repository
            .createQueryBuilder('article')
            .innerJoin('article.topics', 'topic')
            .where('topic.id IN (:...topicIds)', { topicIds })
            .andWhere('topic.isActive = :isActive', {
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
    ): Promise<NewsArticle> {
        const repository: Repository<NewsArticle> =
            manager.getRepository(NewsArticle);

        await repository.upsert(
            {
                title: article.title,
                description: article.description,
                url: article.url,
                sourceName: article.sourceName,
                publishedAt: article.publishedAt,
            },
            ['url'],
        );

        const savedArticle: NewsArticle =
            await repository.findOneByOrFail({
                url: article.url,
            });

        savedArticle.topics = article.topics;

        return repository.save(savedArticle);
    }
}