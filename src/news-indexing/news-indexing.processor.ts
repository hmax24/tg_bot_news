import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';

import { GeminiEmbeddingClient } from '../ai/gemini/gemini-embedding.client';
import { QdrantStorageClient } from '../vector-store/qdrant/qdrant.client';
import { NewsArticleIndex } from './news-article-index.entity';
import { NewsArticleIndexRepository } from './news-article-index.repository';
import { NewsVectorCollectionService } from './news-vector-collection.service';

@Injectable()
export class NewsIndexingProcessor {
    private readonly logger: Logger = new Logger(
        NewsIndexingProcessor.name,
    );

    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        private readonly indexRepository: NewsArticleIndexRepository,
        private readonly collectionService: NewsVectorCollectionService,
        private readonly embeddingClient: GeminiEmbeddingClient,
        private readonly qdrantClient: QdrantStorageClient,
    ) {}

    async processNext(): Promise<boolean> {
        // Проверяем коллекцию до получения задания и расходования API.
        await this.collectionService.ensureReady();

        const collectionName: string = this.configService
            .getOrThrow<string>('QDRANT_COLLECTION')
            .trim();

        const job: NewsArticleIndex | null =
            await this.indexRepository.claimNextPending(
                collectionName,
                this.dataSource.manager,
            );

        if (job === null) {
            return false;
        }

        try {
            await this.processJob(job);

            this.logger.log(
                `Indexing completed: jobId=${job.id}, ` +
                `articleId=${job.articleId}`,
            );

            return true;
        } catch {
            // Не выводим объект HTTP-ошибки: он может содержать API-ключ.
            this.logger.error(
                `Indexing failed: jobId=${job.id}, ` +
                `articleId=${job.articleId}`,
            );

            throw new Error(
                `Не удалось выполнить задание индексации ${job.id}.`,
            );
        }
    }

    private async processJob(
        job: NewsArticleIndex,
    ): Promise<void> {
        const summary: string | null =
            await this.indexRepository.findCompletedSummary(
                job.articleId,
                this.dataSource.manager,
            );

        if (summary === null) {
            throw new Error('Готовый пересказ отсутствует.');
        }

        const embeddingInput: string =
            `title: none | text: ${summary}`;

        const summaryHash: string = createHash('sha256')
            .update(embeddingInput, 'utf8')
            .digest('hex');

        if (summaryHash !== job.summaryHash) {
            throw new Error(
                'Пересказ изменился после создания задания.',
            );
        }

        let embedding: number[] | null = job.embedding;

        if (embedding === null) {
            embedding = await this.embeddingClient.embedSummary(summary);

            await this.indexRepository.saveEmbedding(
                job.id,
                summaryHash,
                embedding,
                this.dataSource.manager,
            );
        }

        await this.qdrantClient.upsertNewsVector(
            job.collectionName,
            {
                articleId: job.articleId,
                summaryHash,
                embedding,
            },
        );

        await this.indexRepository.complete(
            job.id,
            summaryHash,
            this.dataSource.manager,
        );
    }
}