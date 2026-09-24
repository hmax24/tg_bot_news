import { Injectable } from '@nestjs/common';
import { NewsArticle } from '../news-article.entity';
import type { NewsTopic } from '../../news-topic/news-topic.entity';
import type { NewsArticleImportDto } from './news-article-import.dto';
import { NewsArticleDto } from './news-article.dto';
import { NewsTopicDto } from '../../news-topic/dto/news-topic.dto';
import {NewsArticleContent} from "../../news-article-content/news-article-content.entity";
import {NewsArticleSummaryDto} from "./news-article-summary.dto";

@Injectable()
export class NewsArticlesMapper {
  mapToEntity(dto: NewsArticleImportDto, topics: NewsTopic[]): NewsArticle {
    const article: NewsArticle = new NewsArticle();

    article.title = dto.title;
    article.description = dto.description;
    article.url = dto.url;
    article.sourceName = dto.sourceName;
    article.sourceArticleId = dto.sourceArticleId;
    article.publishedAt = dto.publishedAt;
    article.topics = topics;

    return article;
  }

  mapToDto(article: NewsArticle): NewsArticleDto {
    const topics: NewsTopicDto[] = article.topics
      .filter((topic: NewsTopic): boolean => topic.isActive)
      .map((topic: NewsTopic): NewsTopicDto => ({
        id: topic.id,
        name: topic.name,
      }))
      .sort((left: NewsTopicDto, right: NewsTopicDto): number =>
        left.name.localeCompare(right.name),
      );

    return {
      id: article.id,
      title: article.title,
      description: article.description ?? '',
      url: article.url,
      topics,
    };
  }

  mapToDtoList(articles: NewsArticle[]): NewsArticleDto[] {
    return articles.map((article: NewsArticle): NewsArticleDto =>
      this.mapToDto(article),
    );
  }

  mapToSummaryDto(
      content: NewsArticleContent,
  ): NewsArticleSummaryDto {
    const summary: string | null = content.summary;

    if (summary === null || summary.trim().length === 0) {
      throw new Error(
          `Пересказ статьи ${content.articleId} отсутствует.`,
      );
    }

    const article: NewsArticleDto = this.mapToDto(content.article);

    return {
      id: article.id,
      title: article.title,
      summary,
      url: article.url,
      topics: article.topics,
    };
  }
}
