import {Injectable} from '@nestjs/common';
import {DataSource, EntityManager} from 'typeorm';

import {NewsTopic} from '../news-topic/news-topic.entity';
import {NewsTopicsService} from '../news-topic/news-topics.service';
import {NewsArticle} from './news-article.entity';
import {NewsArticlesRepository} from './news-articles.repository';
import {DevToClient} from './sources/dev-to/dev-to-client';
import type {DevToArticle} from './sources/dev-to/dev-to-article';
import type {NewsArticleImportDto} from './dto/news-article-import.dto';
import {DevToArticlesMapper} from './sources/dev-to/dev-to-articles.mapper';
import {NewsArticlesMapper} from './dto/news-articles.mapper';
import type { NewsArticleDto } from './dto/news-article.dto'

@Injectable()
export class NewsArticlesService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly devToClient: DevToClient,
        private readonly devToArticlesMapper: DevToArticlesMapper,
        private readonly newsArticlesMapper: NewsArticlesMapper,
        private readonly newsTopicsService: NewsTopicsService,
        private readonly newsArticlesRepository: NewsArticlesRepository,
    ) {
    }

    async getLatestArticlesByTopicIds(
        topicIds: number[],
    ): Promise<NewsArticleDto[]> {
        const articles: NewsArticle[] =
            await this.newsArticlesRepository.findLatestByTopicIds(
                topicIds,
            );

        return this.newsArticlesMapper.mapToDtoList(articles);
    }

    async importLatestArticles(): Promise<number> {
        const sourceArticles: DevToArticle[] =
            await this.devToClient.getLatestArticles();

        const articles: NewsArticleImportDto[] =
            this.devToArticlesMapper.mapToImportDtoList(sourceArticles);

        let processedCount: number = 0;

        for (
            let index: number = 0;
            index < articles.length;
            index++
        ) {
            const dto: NewsArticleImportDto = articles[index];

            await this.saveImportedArticle(dto);

            processedCount++;
        }

        return processedCount;
    }

    private async saveImportedArticle(
        dto: NewsArticleImportDto,
    ): Promise<void> {
        await this.dataSource.transaction(
            async (manager: EntityManager): Promise<void> => {
                const topics: NewsTopic[] =
                    await this.newsTopicsService.getOrCreateByNames(
                        dto.topicNames,
                        manager,
                    );

                const article: NewsArticle =
                    this.newsArticlesMapper.mapToEntity(dto, topics);

                await this.newsArticlesRepository.saveImported(
                    article,
                    manager,
                );
            },
        );
    }
}