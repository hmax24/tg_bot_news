import { Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';

import { NewsArticleContent } from '../news-article-content/news-article-content.entity';
import { NewsArticleContentStatus } from '../news-article-content/enums/news-article-content-status.enum';
import { NewsArticleIndex } from '../news-indexing/news-article-index.entity';
import { NewsIndexingStatus } from '../news-indexing/enums/news-indexing-status.enum';

@Injectable()
export class NewsSearchRepository {
    async isIndexed(
        articleId: number,
        collectionName: string,
        manager: EntityManager,
    ): Promise<boolean> {
        return manager.getRepository(NewsArticleIndex).exists({
            where: {
                articleId,
                collectionName,
                status: NewsIndexingStatus.COMPLETED,
            },
        });
    }

    async findCompletedContents(
        articleIds: number[],
        manager: EntityManager,
    ): Promise<NewsArticleContent[]> {
        if (articleIds.length === 0) {
            return [];
        }

        const contents: NewsArticleContent[] = await manager
            .getRepository(NewsArticleContent)
            .find({
                select: {
                    id: true,
                    articleId: true,
                    summary: true,
                },
                where: {
                    articleId: In(articleIds),
                    status: NewsArticleContentStatus.COMPLETED,
                },
                relations: {
                    article: {
                        topics: true,
                    },
                },
            });

        const contentsByArticleId: Map<number, NewsArticleContent> =
            new Map<number, NewsArticleContent>();

        for (const content of contents) {
            if (
                content.article &&
                content.summary !== null &&
                content.summary.trim().length > 0
            ) {
                contentsByArticleId.set(
                    content.articleId,
                    content,
                );
            }
        }

        const orderedContents: NewsArticleContent[] = [];
        const includedIds: Set<number> = new Set<number>();

        for (const articleId of articleIds) {
            const content: NewsArticleContent | undefined =
                contentsByArticleId.get(articleId);

            if (content && !includedIds.has(articleId)) {
                orderedContents.push(content);
                includedIds.add(articleId);
            }
        }

        return orderedContents;
    }
}