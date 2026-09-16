import { Injectable } from '@nestjs/common';
import { NewsArticle } from '../news-article.entity';
import type { NewsTopic } from '../../news-topic/news-topic.entity';
import type { NewsArticleImportDto } from './news-article-import.dto';
import {NewsArticleDto} from "./news-article.dto";

@Injectable()
export class NewsArticlesMapper {
    mapToEntity(
        dto: NewsArticleImportDto,
        topics: NewsTopic[],
    ): NewsArticle {
        const article: NewsArticle = new NewsArticle();

        article.title = dto.title;
        article.description = dto.description;
        article.url = dto.url;
        article.sourceName = dto.sourceName;
        article.publishedAt = dto.publishedAt;
        article.topics = topics;

        return article;
    }

    mapToDto(article: NewsArticle): NewsArticleDto {
        const dto: NewsArticleDto = {
            id: article.id,
            title: article.title,
            description: article.description ?? '',
            url: article.url,
        };

        return dto;
    }

    mapToDtoList(articles: NewsArticle[]): NewsArticleDto[] {
        return articles.map(
            (article: NewsArticle): NewsArticleDto =>
                this.mapToDto(article),
        );
    }
}