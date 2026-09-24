import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { NewsTopic } from '../news-topic/news-topic.entity';
import { NewsTopicsService } from '../news-topic/news-topics.service';
import { NewsArticle } from './news-article.entity';
import { NewsArticlesRepository } from './news-articles.repository';
import { DevToClient } from './sources/dev-to/dev-to-client';
import type { DevToArticle } from './sources/dev-to/dev-to-article';
import type { NewsArticleImportDto } from './dto/news-article-import.dto';
import { DevToArticlesMapper } from './sources/dev-to/dev-to-articles.mapper';
import { NewsArticlesMapper } from './dto/news-articles.mapper';
import type { NewsArticleDto } from './dto/news-article.dto';
import {NewsArticleContentService} from "../news-article-content/news-article-content.service";
import {NewsArticleContent} from "../news-article-content/news-article-content.entity";
import {NewsArticleSummaryDto} from "./dto/news-article-summary.dto";

@Injectable()
export class NewsArticlesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly devToClient: DevToClient,
    private readonly devToArticlesMapper: DevToArticlesMapper,
    private readonly newsArticlesMapper: NewsArticlesMapper,
    private readonly newsTopicsService: NewsTopicsService,
    private readonly newsArticlesRepository: NewsArticlesRepository,
    private readonly newsArticleContentService: NewsArticleContentService,
  ) {}

  async getLatestArticlesByTopicIds(
    topicIds: number[],
  ): Promise<NewsArticleDto[]> {
    const articles: NewsArticle[] =
      await this.newsArticlesRepository.findLatestByTopicIds(topicIds);

    return this.newsArticlesMapper.mapToDtoList(articles);
  }

  async importLatestArticles(): Promise<number> {
    const sourceArticles: DevToArticle[] =
      await this.devToClient.getLatestArticles();

    const articles: NewsArticleImportDto[] =
      this.devToArticlesMapper.mapToImportDtoList(sourceArticles);

    let processedCount: number = 0;

    for (let index: number = 0; index < articles.length; index++) {
      const dto: NewsArticleImportDto = articles[index];

      const created: boolean = await this.saveImportedArticle(dto);

      if (created) {
        processedCount++;
      }
    }

    return processedCount;
  }

  private async saveImportedArticle(
    dto: NewsArticleImportDto,
  ): Promise<boolean> {
    return this.dataSource.transaction(
      async (manager: EntityManager): Promise<boolean> => {
        const article: NewsArticle = this.newsArticlesMapper.mapToEntity(
          dto,
          [],
        );

        const savedArticle: NewsArticle | null =
          await this.newsArticlesRepository.saveImported(article, manager);

        if (savedArticle === null) {
          return false;
        }

        const topics: NewsTopic[] =
          await this.newsTopicsService.getOrCreateByNames(
            dto.topicNames,
            manager,
          );

        const topicIds: number[] = topics.map(
          (topic: NewsTopic): number => topic.id,
        );

        await this.newsArticlesRepository.addTopics(
          savedArticle.id,
          topicIds,
          manager,
        );

          await this.newsArticleContentService.createForArticle(
              savedArticle.id,
              manager,
          );

        return true;
      },
    );
  }

    async getLatestSummariesByTopicIds(
        topicIds: number[],
    ): Promise<NewsArticleSummaryDto[]> {
        const contents: NewsArticleContent[] =
            await this.newsArticlesRepository.findLatestSummariesByTopicIds(
                topicIds,
            );

        return contents.map(
            (content: NewsArticleContent): NewsArticleSummaryDto =>
                this.newsArticlesMapper.mapToSummaryDto(content),
        );
    }
}
