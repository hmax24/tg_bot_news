import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';

import { ChunkCollectionService } from './chunk-collection.service';
import { IngestionService } from './ingestion.service';
import { NewsIngestion } from './news-ingestion.entity';
import { NewsIngestionRepository } from './news-ingestion.repository';

@Injectable()
export class NewsIngestionProcessor {
    private readonly logger: Logger = new Logger(
        NewsIngestionProcessor.name,
    );

    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        private readonly repository: NewsIngestionRepository,
        private readonly collectionService: ChunkCollectionService,
        private readonly ingestionService: IngestionService,
    ) {}

    async processNext(): Promise<boolean> {
        // Не забираем задание, если коллекция недоступна
        // или имеет несовместимые настройки.
        await this.collectionService.ensureReady();

        const collectionName: string = this.configService
            .getOrThrow<string>('QDRANT_CHUNKS_COLLECTION')
            .trim();

        const job: NewsIngestion | null =
            await this.repository.claimNextPending(
                collectionName,
                this.dataSource.manager,
            );

        if (job === null) {
            return false;
        }

        try {
            const summary: string | null =
                await this.repository.findCompletedSummary(
                    job.articleId,
                    this.dataSource.manager,
                );

            if (summary === null) {
                throw new Error('Готовый пересказ отсутствует.');
            }

            const summaryHash: string = createHash('sha256')
                .update(summary, 'utf8')
                .digest('hex');

            if (summaryHash !== job.summaryHash) {
                throw new Error(
                    'Пересказ изменился после создания задания.',
                );
            }

            const chunkCount: number =
                await this.ingestionService.ingestSummary(
                    job.articleId,
                    summary,
                );

            await this.repository.complete(
                job.id,
                job.summaryHash,
                chunkCount,
                this.dataSource.manager,
            );

            this.logger.log(
                `Ingestion completed: jobId=${job.id}, ` +
                `articleId=${job.articleId}, chunks=${chunkCount}`,
            );

            return true;
        } catch {
            try {
                await this.repository.markFailed(
                    job.id,
                    job.summaryHash,
                    this.dataSource.manager,
                );
            } catch {
                this.logger.error(
                    `Failed to save ingestion failure: jobId=${job.id}`,
                );
            }

            // Не выводим HTTP-ошибку целиком:
            // она может содержать заголовки с API-ключом.
            this.logger.error(
                `Ingestion failed: jobId=${job.id}, ` +
                `articleId=${job.articleId}`,
            );

            throw new Error(
                `Не удалось выполнить задание ingestion ${job.id}.`,
            );
        }
    }
}