import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { NewsSummaryChunk } from './types/news-summary-chunk';

@Injectable()
export class ChunkingService {
    constructor(
        private readonly configService: ConfigService,
    ) {}

    chunkSummary(
        articleId: number,
        summary: string,
    ): NewsSummaryChunk[] {
        if (
            !Number.isSafeInteger(articleId) ||
            articleId <= 0
        ) {
            throw new Error('Некорректный ID статьи.');
        }

        const chunkSize: number = this.readInteger(
            'NEWS_CHUNK_SIZE',
            1,
        );

        const overlap: number = this.readInteger(
            'NEWS_CHUNK_OVERLAP',
            0,
        );

        if (overlap >= chunkSize) {
            throw new Error(
                'NEWS_CHUNK_OVERLAP должен быть меньше NEWS_CHUNK_SIZE.',
            );
        }

        const text: string = summary.trim();

        if (text.length === 0) {
            throw new Error('Нельзя разбить пустой пересказ.');
        }

        // Считаем Unicode-кодовые точки, не разрывая суррогатные пары.
        const characters: string[] = Array.from(text);
        const chunks: NewsSummaryChunk[] = [];

        let start: number = 0;

        while (start < characters.length) {
            const end: number = Math.min(
                start + chunkSize,
                characters.length,
            );

            const chunkText: string = characters
                .slice(start, end)
                .join('');

            chunks.push({
                articleId,
                index: chunks.length,
                text: chunkText,
                startOffset: start,
                endOffset: end,
            });

            // Не создаём лишний чанк только из последнего overlap.
            if (end === characters.length) {
                break;
            }

            start = end - overlap;
        }

        return chunks;
    }

    private readInteger(
        name: string,
        minimum: number,
    ): number {
        const rawValue: string = this.configService
            .getOrThrow<string>(name)
            .trim();

        const value: number = Number(rawValue);

        if (
            !/^\d+$/.test(rawValue) ||
            !Number.isSafeInteger(value) ||
            value < minimum
        ) {
            throw new Error(
                `${name} должен быть целым числом не меньше ${minimum}.`,
            );
        }

        return value;
    }
}