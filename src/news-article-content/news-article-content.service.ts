import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

import { NewsArticleContentRepository } from './news-article-content.repository';

@Injectable()
export class NewsArticleContentService {
    constructor(
        private readonly repository: NewsArticleContentRepository,
    ) {}

    async createForArticle(
        articleId: number,
        manager: EntityManager,
    ): Promise<void> {
        await this.repository.createPending(articleId, manager);
    }
}