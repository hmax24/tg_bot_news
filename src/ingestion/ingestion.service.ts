import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { ChunkingService } from './chunking.service';
import type { NewsSummaryChunk } from './types/news-summary-chunk';
import type { PreparedNewsChunk } from './types/prepared-news-chunk';
import {ChunkCollectionService} from "./chunk-collection.service";
import {ConfigService} from "@nestjs/config";
import {NewsChunkStorageService} from "../vector-store/news-chunk-storage.service";

@Injectable()
export class IngestionService {
    constructor(
        private readonly chunkingService: ChunkingService,
        private readonly configService: ConfigService,
        private readonly collectionService: ChunkCollectionService,
        private readonly chunkStorage: NewsChunkStorageService,
    ) {}

    async ingestSummary(
        articleId: number,
        summary: string,
    ): Promise<number> {
        const chunks: PreparedNewsChunk[] = this.prepareSummary(
            articleId,
            summary,
        );

        // Проверяем коллекцию до расходования Gemini API.
        await this.collectionService.ensureReady();

        const collectionName: string = this.configService
            .getOrThrow<string>('QDRANT_CHUNKS_COLLECTION')
            .trim();

        return this.chunkStorage.saveChunks(
            collectionName,
            chunks,
        );
    }

    prepareSummary(
        articleId: number,
        summary: string,
    ): PreparedNewsChunk[] {
        const normalizedSummary: string = summary.trim();

        const chunks: NewsSummaryChunk[] =
            this.chunkingService.chunkSummary(
                articleId,
                normalizedSummary,
            );

        const summaryHash: string = createHash('sha256')
            .update(normalizedSummary, 'utf8')
            .digest('hex');

        return chunks.map(
            (chunk: NewsSummaryChunk): PreparedNewsChunk => ({
                ...chunk,
                summaryHash,
                pointId: this.createPointId(
                    chunk,
                    summaryHash,
                ),
            }),
        );
    }

    private createPointId(
        chunk: NewsSummaryChunk,
        summaryHash: string,
    ): string {
        const identity: string = JSON.stringify([
            'news-summary-chunk-v1',
            chunk.articleId,
            summaryHash,
            chunk.index,
            chunk.startOffset,
            chunk.endOffset,
        ]);

        const bytes: Buffer = createHash('sha256')
            .update(identity, 'utf8')
            .digest()
            .subarray(0, 16);

        // UUID версии 8: детерминированный ID из нашего хеша.
        bytes[6] = (bytes[6] & 0x0f) | 0x80;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const hex: string = bytes.toString('hex');

        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20, 32),
        ].join('-');
    }
}