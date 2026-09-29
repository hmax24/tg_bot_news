import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { QdrantStorageClient } from '../vector-store/qdrant/qdrant.client';

@Injectable()
export class NewsVectorCollectionService {
    constructor(
        private readonly configService: ConfigService,
        private readonly qdrantClient: QdrantStorageClient,
    ) {}

    async ensureReady(): Promise<void> {
        const collectionName: string = this.configService
            .getOrThrow<string>('QDRANT_COLLECTION')
            .trim();

        const embeddingModel: string = this.configService
            .getOrThrow<string>('GEMINI_EMBEDDING_MODEL')
            .trim();

        const dimensionsValue: string = this.configService
            .getOrThrow<string>('GEMINI_EMBEDDING_DIMENSIONS')
            .trim();

        const dimensions: number = Number(dimensionsValue);

        if (!/^[a-zA-Z0-9_-]+$/.test(collectionName)) {
            throw new Error('Некорректное название QDRANT_COLLECTION.');
        }

        if (embeddingModel.length === 0) {
            throw new Error('GEMINI_EMBEDDING_MODEL не должен быть пустым.');
        }

        if (
            !/^[1-9]\d*$/.test(dimensionsValue) ||
            !Number.isSafeInteger(dimensions)
        ) {
            throw new Error(
                'GEMINI_EMBEDDING_DIMENSIONS должен быть положительным целым числом.',
            );
        }

        await this.qdrantClient.ensureCollection(
            collectionName,
            dimensions,
            embeddingModel,
        );
    }
}