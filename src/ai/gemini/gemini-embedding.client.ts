import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { AxiosResponse } from 'axios';

import type { GeminiEmbeddingResponse } from './interfaces/gemini-embedding-response.interface';

@Injectable()
export class GeminiEmbeddingClient {
    constructor(
        private readonly configService: ConfigService,
    ) {}

    async embedSummary(summary: string): Promise<number[]> {
        const text: string = summary.trim();

        if (text.length === 0) {
            throw new Error('Нельзя индексировать пустой пересказ.');
        }

        return this.embed(`title: none | text: ${text}`);
    }

    async embedQuery(query: string): Promise<number[]> {
        const text: string = query.trim();

        if (text.length === 0) {
            throw new Error('Поисковый запрос не должен быть пустым.');
        }

        return this.embed(`task: search result | query: ${text}`);
    }

    private async embed(text: string): Promise<number[]> {
        const apiKey: string = this.configService
            .getOrThrow<string>('GOOGLE_API_KEY')
            .trim();

        const modelName: string = this.configService
            .getOrThrow<string>('GEMINI_EMBEDDING_MODEL')
            .trim();

        const dimensionsValue: string = this.configService
            .getOrThrow<string>('GEMINI_EMBEDDING_DIMENSIONS')
            .trim();

        const dimensions: number = Number(dimensionsValue);

        if (apiKey.length === 0) {
            throw new Error('GOOGLE_API_KEY не должен быть пустым.');
        }

        if (!/^gemini-[a-zA-Z0-9._-]+$/.test(modelName)) {
            throw new Error(
                'Некорректное значение GEMINI_EMBEDDING_MODEL.',
            );
        }

        if (
            !/^[1-9]\d*$/.test(dimensionsValue) ||
            !Number.isSafeInteger(dimensions)
        ) {
            throw new Error(
                'GEMINI_EMBEDDING_DIMENSIONS должен быть положительным целым числом.',
            );
        }

        const response: AxiosResponse<GeminiEmbeddingResponse> =
            await axios.post<GeminiEmbeddingResponse>(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent`,
                {
                    model: `models/${modelName}`,
                    content: {
                        parts: [{ text }],
                    },
                    outputDimensionality: dimensions,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey,
                    },
                    timeout: 30_000,
                },
            );

        const values: number[] | undefined =
            response.data?.embedding?.values;

        if (
            !Array.isArray(values) ||
            values.length !== dimensions ||
            !values.every(
                (value: number): boolean => Number.isFinite(value),
            ) ||
            !values.some(
                (value: number): boolean => value !== 0,
            )
        ) {
            throw new Error(
                'Gemini вернул некорректный embedding.',
            );
        }

        return values;
    }
}