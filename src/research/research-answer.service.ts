import { Injectable } from '@nestjs/common';

import { GeminiClient } from '../ai/gemini/gemini.client';
import { RESEARCH_ANSWER_SYSTEM_PROMPT } from './prompts/research-answer.prompt';
import type { ResearchAnswer } from './types/research-answer';
import type { ResearchContextFragment } from './types/research-context-fragment';
import { ResearchAnswerValidator } from './validation/research-answer.validator';

@Injectable()
export class ResearchAnswerService {
    constructor(
        private readonly geminiClient: GeminiClient,
    ) {}

    async generate(
        question: string,
        fragments: ResearchContextFragment[],
    ): Promise<ResearchAnswer> {
        const normalizedQuestion: string = question.trim();

        if (
            normalizedQuestion.length === 0 ||
            Array.from(normalizedQuestion).length > 2000
        ) {
            throw new Error(
                'Вопрос должен содержать от 1 до 2000 символов.',
            );
        }

        if (fragments.length > 6) {
            throw new Error(
                'В контексте допускается максимум 6 фрагментов.',
            );
        }

        if (fragments.length === 0) {
            return {
                answer:
                    'В проиндексированном архиве недостаточно данных для ответа.',
                sourceArticleIds: [],
            };
        }

        const input: string = JSON.stringify({
            question: normalizedQuestion,
            fragments: fragments.map(
                (
                    fragment: ResearchContextFragment,
                ): { articleId: number; text: string } => ({
                    articleId: fragment.articleId,
                    text: fragment.text,
                }),
            ),
        });

        const rawResponse: string =
            await this.geminiClient.generateText(
                RESEARCH_ANSWER_SYSTEM_PROMPT,
                input,
            );

        const allowedArticleIds: number[] = fragments.map(
            (fragment: ResearchContextFragment): number =>
                fragment.articleId,
        );

        return ResearchAnswerValidator.parse(
            rawResponse,
            allowedArticleIds,
        );
    }
}