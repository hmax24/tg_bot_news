import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import { NewsArticleContentProcessor } from './news-article-content-processor.service';

@Injectable()
export class NewsArticleContentJob {
    private readonly logger: Logger =
        new Logger(NewsArticleContentJob.name);

    private readonly enabled: boolean;

    constructor(
        private readonly processor: NewsArticleContentProcessor,
        configService: ConfigService,
    ) {
        const enabledValue: string = configService.get<string>(
            'NEWS_CONTENT_PROCESSING_ENABLED',
            'false',
        );

        if (enabledValue !== 'true' && enabledValue !== 'false') {
            throw new Error(
                'NEWS_CONTENT_PROCESSING_ENABLED должен быть true или false.',
            );
        }

        this.enabled = enabledValue === 'true';

        if (this.enabled) {
            const apiKey: string = configService
                .getOrThrow<string>('GOOGLE_API_KEY')
                .trim();

            if (apiKey.length === 0) {
                throw new Error('GOOGLE_API_KEY не должен быть пустым.');
            }
        }
    }

    @Cron('*/5 * * * * *', {
        name: 'news-article-content',
        waitForCompletion: true,
    })
    async run(): Promise<void> {
        if (!this.enabled) {
            return;
        }

        try {
            await this.processor.processNext();
        } catch {
            this.logger.error(
                'Article processing job failed. Check article processing status.',
            );
        }
    }
}