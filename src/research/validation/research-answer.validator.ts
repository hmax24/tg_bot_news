import type { ResearchAnswer } from '../types/research-answer';

export class ResearchAnswerValidator {
    static parse(
        rawResponse: string,
        allowedArticleIds: number[],
    ): ResearchAnswer {
        let parsed: unknown;

        try {
            parsed = JSON.parse(rawResponse.trim());
        } catch {
            throw new Error('Модель вернула некорректный JSON.');
        }

        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            Array.isArray(parsed) ||
            !('answer' in parsed) ||
            !('sourceArticleIds' in parsed) ||
            Object.keys(parsed).length !== 2
        ) {
            throw new Error('Некорректная структура ответа модели.');
        }

        if (typeof parsed.answer !== 'string') {
            throw new Error('Поле answer должно быть строкой.');
        }

        const answer: string = parsed.answer.trim();

        if (answer.length === 0 || answer.length > 3000) {
            throw new Error(
                'Ответ должен содержать от 1 до 3000 символов.',
            );
        }

        const sourceIds: unknown = parsed.sourceArticleIds;

        if (
            !Array.isArray(sourceIds) ||
            !sourceIds.every(
                (id: unknown): id is number =>
                    typeof id === 'number' &&
                    Number.isSafeInteger(id) &&
                    id > 0,
            )
        ) {
            throw new Error('Некорректный список источников.');
        }

        const sourceArticleIds: number[] = sourceIds;
        const allowedIds: Set<number> = new Set(allowedArticleIds);
        const declaredIds: Set<number> = new Set(sourceArticleIds);

        if (declaredIds.size !== sourceArticleIds.length) {
            throw new Error('Список источников содержит дубликаты.');
        }

        for (const articleId of sourceArticleIds) {
            if (!allowedIds.has(articleId)) {
                throw new Error(
                    'Модель указала источник вне переданного контекста.',
                );
            }
        }

        const citedIds: Set<number> = new Set<number>();

        for (const match of answer.matchAll(/\[(\d+)\]/g)) {
            const articleId: number = Number(match[1]);

            if (
                !Number.isSafeInteger(articleId) ||
                !declaredIds.has(articleId)
            ) {
                throw new Error(
                    'Ссылка в ответе отсутствует в списке источников.',
                );
            }

            citedIds.add(articleId);
        }

        if (citedIds.size !== declaredIds.size) {
            throw new Error(
                'Не все перечисленные источники упомянуты в ответе.',
            );
        }

        // Ответ без источников допускаем только как явный отказ
        // из-за недостатка данных.
        if (
            sourceArticleIds.length === 0 &&
            answer !==
            'В проиндексированном архиве недостаточно данных для ответа.'
        ) {
            throw new Error(
                'Содержательный ответ должен ссылаться на источники.',
            );
        }

        return {
            answer,
            sourceArticleIds,
        };
    }
}