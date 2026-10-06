import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { EntityManager, In } from 'typeorm';

import { NewsArticleContent } from '../news-article-content/news-article-content.entity';
import { NewsArticleContentStatus } from '../news-article-content/enums/news-article-content-status.enum';
import { NewsIngestion } from '../ingestion/news-ingestion.entity';
import { NewsIngestionStatus } from '../ingestion/enums/news-ingestion-status.enum';
import type { NewsChunkSearchResult } from '../vector-store/qdrant/interfaces/news-chunk-search-result';

@Injectable()
export class ResearchRepository {
    async filterValidChunks(
        collectionName: string,
        candidates: NewsChunkSearchResult[],
        manager: EntityManager,
    ): Promise<NewsChunkSearchResult[]> {
        if (candidates.length === 0) {
            return [];
        }

        if (candidates.length > 20) {
            throw new Error(
                'За один запрос можно проверить максимум 20 чанков.',
            );
        }

        const articleIds: number[] = [
            ...new Set(
                candidates.map(
                    (chunk: NewsChunkSearchResult): number =>
                        chunk.articleId,
                ),
            ),
        ];

        const jobs: NewsIngestion[] = await manager
            .getRepository(NewsIngestion)
            .find({
                select: {
                    id: true,
                    articleId: true,
                    summaryHash: true,
                    chunkCount: true,
                },
                where: {
                    articleId: In(articleIds),
                    collectionName,
                    status: NewsIngestionStatus.COMPLETED,
                },
            });

        const completedArticleIds: number[] = jobs.map(
            (job: NewsIngestion): number => job.articleId,
        );

        if (completedArticleIds.length === 0) {
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
                    articleId: In(completedArticleIds),
                    status: NewsArticleContentStatus.COMPLETED,
                },
            });

        const jobsByArticleId: Map<number, NewsIngestion> =
            new Map<number, NewsIngestion>();

        for (const job of jobs) {
            jobsByArticleId.set(job.articleId, job);
        }

        const summariesByArticleId: Map<number, string[]> =
            new Map<number, string[]>();

        for (const content of contents) {
            const summary: string = content.summary?.trim() ?? '';
            const job: NewsIngestion | undefined =
                jobsByArticleId.get(content.articleId);

            if (summary.length === 0 || job === undefined) {
                continue;
            }

            const currentHash: string = createHash('sha256')
                .update(summary, 'utf8')
                .digest('hex');

            if (currentHash !== job.summaryHash) {
                continue;
            }

            summariesByArticleId.set(
                content.articleId,
                Array.from(summary),
            );
        }

        const result: NewsChunkSearchResult[] = [];
        const includedPointIds: Set<string> = new Set<string>();

        for (const chunk of candidates) {
            const job: NewsIngestion | undefined =
                jobsByArticleId.get(chunk.articleId);

            const characters: string[] | undefined =
                summariesByArticleId.get(chunk.articleId);

            if (
                job === undefined ||
                characters === undefined ||
                chunk.summaryHash !== job.summaryHash ||
                chunk.index >= job.chunkCount ||
                chunk.endOffset > characters.length ||
                includedPointIds.has(chunk.pointId)
            ) {
                continue;
            }

            const expectedText: string = characters
                .slice(chunk.startOffset, chunk.endOffset)
                .join('');

            if (expectedText !== chunk.text) {
                continue;
            }

            result.push(chunk);
            includedPointIds.add(chunk.pointId);
        }

        return result;
    }
}