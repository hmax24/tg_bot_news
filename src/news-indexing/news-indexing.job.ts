import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import { NewsIndexingService } from './news-indexing.service';
import { NewsIndexingProcessor } from './news-indexing.processor';

@Injectable()
export class NewsIndexingJob {
    private readonly logger: Logger = new Logger(
        NewsIndexingJob.name,
    );

    private readonly enabled: boolean;

    constructor(
        private readonly indexingService: NewsIndexingService,
        private readonly processor: NewsIndexingProcessor,
        configService: ConfigService,
    ) {
        const enabledValue: string = configService.get<string>(
            'NEWS_INDEXING_ENABLED',
            'false',
        );

        if (enabledValue !== 'true' && enabledValue !== 'false') {
            throw new Error(
                'NEWS_INDEXING_ENABLED должен быть true или false.',
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

    @Cron('*/30 * * * * *', {
        name: 'news-indexing',
        waitForCompletion: true,
    })
    async run(): Promise<void> {
        if (!this.enabled) {
            return;
        }

        try {
            await this.indexingService.prepareNext();

            // Обрабатываем очередь даже тогда,
            // когда новая статья не была найдена.
            await this.processor.processNext();
        } catch {
            this.logger.error(
                'News indexing job failed. Check indexing status.',
            );
        }
    }
}