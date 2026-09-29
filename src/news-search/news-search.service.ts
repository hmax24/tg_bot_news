import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { NewsArticleContent } from '../news-article-content/news-article-content.entity';
import type { NewsArticleSummaryDto } from '../news_article/dto/news-article-summary.dto';
import { NewsArticlesMapper } from '../news_article/dto/news-articles.mapper';
import { NewsSearchRepository } from './news-search.repository';

@Injectable()
export class NewsSearchService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly repository: NewsSearchRepository,
        private readonly articlesMapper: NewsArticlesMapper,
    ) {}

    async getArticle(
        articleId: number,
    ): Promise<NewsArticleSummaryDto | null> {
        if (
            !Number.isSafeInteger(articleId) ||
            articleId <= 0 ||
            articleId > 2_147_483_647
        ) {
            throw new Error('Некорректный ID статьи.');
        }

        const contents: NewsArticleContent[] =
            await this.repository.findCompletedContents(
                [articleId],
                this.dataSource.manager,
            );

        const content: NewsArticleContent | undefined = contents[0];

        if (content === undefined) {
            return null;
        }

        return this.articlesMapper.mapToSummaryDto(content);
    }
}