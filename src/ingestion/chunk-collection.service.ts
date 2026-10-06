import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { QdrantStorageClient } from '../vector-store/qdrant/qdrant.client';

@Injectable()
export class ChunkCollectionService {
    constructor(
        private readonly configService: ConfigService,
        private readonly qdrantClient: QdrantStorageClient,
    ) {}

    async ensureReady(): Promise<void> {
        const collectionName: string = this.configService
            .getOrThrow<string>('QDRANT_CHUNKS_COLLECTION')
            .trim();

        const summaryCollectionName: string = this.configService
            .getOrThrow<string>('QDRANT_COLLECTION')
            .trim();

        if (
            collectionName.length > 255 ||
            !/^[a-zA-Z0-9_-]+$/.test(collectionName)
        ) {
            throw new Error('Некорректный QDRANT_CHUNKS_COLLECTION.');
        }

        if (collectionName === summaryCollectionName) {
            throw new Error(
                'Для чанков нужна отдельная коллекция Qdrant.',
            );
        }

        const model: string = this.configService
            .getOrThrow<string>('GEMINI_EMBEDDING_MODEL')
            .trim();

        if (!/^gemini-[a-zA-Z0-9._-]+$/.test(model)) {
            throw new Error('Некорректный GEMINI_EMBEDDING_MODEL.');
        }

        const dimensions: number = this.readInteger(
            'GEMINI_EMBEDDING_DIMENSIONS',
            1,
        );

        const size: number = this.readInteger(
            'NEWS_CHUNK_SIZE',
            1,
        );

        const overlap: number = this.readInteger(
            'NEWS_CHUNK_OVERLAP',
            0,
        );

        await this.qdrantClient.ensureCollection(
            collectionName,
            dimensions,
            model,
            { size, overlap },
        );
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