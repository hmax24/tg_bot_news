import { Injectable } from '@nestjs/common';

import { GeminiClient } from '../ai/gemini/gemini.client';
import { NEWS_SUMMARY_SYSTEM_PROMPT } from './prompts/news-summary.prompt';

@Injectable()
export class NewsArticleSummaryService {
    private readonly maxSummaryLength: number = 2000;

    constructor(
        private readonly geminiClient: GeminiClient,
    ) {}

    async summarize(fullText: string): Promise<string> {
        const articleText: string = fullText.trim();

        if (articleText.length === 0) {
            throw new Error(
                'Нельзя создать пересказ статьи с пустым текстом.',
            );
        }

        const generatedText: string =
            await this.geminiClient.generateText(
                NEWS_SUMMARY_SYSTEM_PROMPT,
                articleText,
            );

        const summary: string = generatedText.trim();

        if (summary.length === 0) {
            throw new Error('Gemini вернул пустой пересказ.');
        }

        if (summary.length > this.maxSummaryLength) {
            throw new Error(
                `Пересказ превышает лимит ${this.maxSummaryLength} символов.`,
            );
        }

        return summary;
    }
}