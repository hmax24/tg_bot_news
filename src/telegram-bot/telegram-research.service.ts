import { Injectable } from '@nestjs/common';

import { ResearchGraph } from '../research/graphs/research.graph';
import type { ResearchAnswer } from '../research/types/research-answer';
import { NewsSearchService } from '../news-search/news-search.service';
import type { NewsArticleSummaryDto } from '../news_article/dto/news-article-summary.dto';
import type { TelegramMessageDto } from '../telegram-messaging/dto/telegram-message.dto';
import type { TelegramCallbackButtonDto } from '../telegram-messaging/dto/telegram-callback-button.dto';

@Injectable()
export class TelegramResearchService {
    constructor(
        private readonly researchGraph: ResearchGraph,
        private readonly newsSearchService: NewsSearchService,
    ) {}

    async research(question: string): Promise<TelegramMessageDto> {
        const result: ResearchAnswer =
            await this.researchGraph.research(question);

        const buttons: TelegramCallbackButtonDto[] = [];

        for (const articleId of result.sourceArticleIds) {
            const article: NewsArticleSummaryDto | null =
                await this.newsSearchService.getArticle(articleId);

            const title: string = article?.title
                .replace(/\s+/g, ' ')
                .trim() || 'Статья недоступна';

            buttons.push({
                text: title,
                callbackData: `article:${articleId}`,
            });
        }

        return {
            text: result.answer,
            buttons,
        };
    }
}