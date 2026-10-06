import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import { NewsIngestionQueueService } from './news-ingestion-queue.service';
import { NewsIngestionProcessor } from './news-ingestion.processor';

@Injectable()
export class NewsIngestionJob {
    private readonly logger: Logger = new Logger(
        NewsIngestionJob.name,
    );

    private readonly enabled: boolean;

    constructor(
        private readonly queueService: NewsIngestionQueueService,
        private readonly processor: NewsIngestionProcessor,
        configService: ConfigService,
    ) {
        const enabledValue: string = configService.get<string>(
            'NEWS_INGESTION_ENABLED',
            'false',
        );

        if (enabledValue !== 'true' && enabledValue !== 'false') {
            throw new Error(
                'NEWS_INGESTION_ENABLED должен быть true или false.',
            );
        }

        this.enabled = enabledValue === 'true';

        if (this.enabled) {
            const requiredVariables: string[] = [
                'GOOGLE_API_KEY',
                'GEMINI_EMBEDDING_MODEL',
                'GEMINI_EMBEDDING_DIMENSIONS',
                'QDRANT_URL',
                'QDRANT_COLLECTION',
                'QDRANT_CHUNKS_COLLECTION',
            ];

            for (const variableName of requiredVariables) {
                const value: string = configService
                    .getOrThrow<string>(variableName)
                    .trim();

                if (value.length === 0) {
                    throw new Error(
                        `${variableName} не должен быть пустым.`,
                    );
                }
            }
        }
    }

    @Cron('15 * * * * *', {
        name: 'news-ingestion',
        waitForCompletion: true,
    })
    async run(): Promise<void> {
        if (!this.enabled) {
            return;
        }

        try {
            await this.queueService.prepareNext();

            // Обрабатываем существующую очередь,
            // даже если новая статья не найдена.
            await this.processor.processNext();
        } catch {
            this.logger.error(
                'News ingestion job failed. Check ingestion status.',
            );
        }
    }
}