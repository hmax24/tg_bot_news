import {Injectable} from '@nestjs/common';
import type {DevToArticle} from './dev-to-article';
import type {NewsArticleImportDto} from '../../dto/news-article-import.dto';
import {NewsArticleDto} from "../../dto/news-article.dto";
import {NewsArticle} from "../../news-article.entity";

@Injectable()
export class DevToArticlesMapper {
    mapToImportDto(article: DevToArticle): NewsArticleImportDto {
        const dto: NewsArticleImportDto = {
            title: article.title,
            description: article.description,
            url: article.url,
            sourceName: 'dev.to',
            publishedAt: new Date(article.published_at),
            topicNames: [...article.tag_list],
        };

        return dto;
    }

    mapToImportDtoList(
        articles: DevToArticle[],
    ): NewsArticleImportDto[] {
        return articles.map(
            (article: DevToArticle): NewsArticleImportDto =>
                this.mapToImportDto(article),
        );
    }
}