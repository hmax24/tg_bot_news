import { Injectable } from '@nestjs/common';

import { GeminiEmbeddingClient } from '../ai/gemini/gemini-embedding.client';
import { QdrantStorageClient } from './qdrant/qdrant.client';
import type { NewsChunkPoint } from './qdrant/interfaces/news-chunk-point';

export type NewsChunkInput = Omit<NewsChunkPoint, 'embedding'>;

@Injectable()
export class NewsChunkStorageService {
    constructor(
        private readonly embeddingClient: GeminiEmbeddingClient,
        private readonly qdrantClient: QdrantStorageClient,
    ) {}

    async saveChunks(
        collectionName: string,
        chunks: NewsChunkInput[],
    ): Promise<number> {
        let savedCount: number = 0;

        for (const chunk of chunks) {
            const embedding: number[] =
                await this.embeddingClient.embedSummary(chunk.text);

            await this.qdrantClient.upsertNewsChunk(
                collectionName,
                {
                    ...chunk,
                    embedding,
                },
            );

            savedCount += 1;
        }

        return savedCount;
    }
}