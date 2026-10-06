import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { GeminiEmbeddingClient } from '../ai/gemini/gemini-embedding.client';
import { ChunkCollectionService } from '../ingestion/chunk-collection.service';
import { QdrantStorageClient } from '../vector-store/qdrant/qdrant.client';
import type { NewsChunkSearchResult } from '../vector-store/qdrant/interfaces/news-chunk-search-result';
import { ResearchRepository } from './research.repository';

@Injectable()
export class ResearchRetrievalService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        private readonly collectionService: ChunkCollectionService,
        private readonly embeddingClient: GeminiEmbeddingClient,
        private readonly qdrantClient: QdrantStorageClient,
        private readonly repository: ResearchRepository,
    ) {}

    async search(
        question: string,
    ): Promise<NewsChunkSearchResult[]> {
        const normalizedQuestion: string = question.trim();

        if (normalizedQuestion.length === 0) {
            throw new Error('Вопрос не должен быть пустым.');
        }

        if (Array.from(normalizedQuestion).length > 2000) {
            throw new Error(
                'Вопрос не должен превышать 2000 символов.',
            );
        }

        // Проверяем доступность коллекции и совместимость модели
        // до обращения к embedding API.
        await this.collectionService.ensureReady();

        const collectionName: string = this.configService
            .getOrThrow<string>('QDRANT_CHUNKS_COLLECTION')
            .trim();

        const embedding: number[] =
            await this.embeddingClient.embedQuery(
                normalizedQuestion,
            );

        const candidates: NewsChunkSearchResult[] =
            await this.qdrantClient.searchNewsChunks(
                collectionName,
                embedding,
                10,
            );

        return this.repository.filterValidChunks(
            collectionName,
            candidates,
            this.dataSource.manager,
        );
    }
}