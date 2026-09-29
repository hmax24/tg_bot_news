import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import {NewsVectorPoint} from "./interfaces/news-vector-point.interface";
import {SimilarNewsPoint} from "./interfaces/similar-news-point.interface";

@Injectable()
export class QdrantStorageClient {
    private client: QdrantClient | null = null;

    constructor(
        private readonly configService: ConfigService,
    ) {}

    async getCollectionNames(): Promise<string[]> {
        const client: QdrantClient = this.getClient();

        const response: Awaited<
            ReturnType<QdrantClient['getCollections']>
        > = await client.getCollections();

        return response.collections.map(
            (collection: { name: string }): string => collection.name,
        );
    }

    async ensureCollection(
        collectionName: string,
        dimensions: number,
        embeddingModel: string,
    ): Promise<void> {
        const client: QdrantClient = this.getClient();

        const existence: Awaited<
            ReturnType<QdrantClient['collectionExists']>
        > = await client.collectionExists(collectionName);

        if (!existence.exists) {
            await client.createCollection(collectionName, {
                vectors: {
                    size: dimensions,
                    distance: 'Cosine',
                    on_disk: true,
                },
                on_disk_payload: true,
                shard_number: 1,
                hnsw_config: {
                    on_disk: true,
                    max_indexing_threads: 1,
                },
                optimizers_config: {
                    default_segment_number: 1,
                    max_optimization_threads: 1,
                },
                metadata: {
                    embedding_model: embeddingModel,
                    content_type: 'news_summary',
                },
            });
        }

        const collection: Awaited<
            ReturnType<QdrantClient['getCollection']>
        > = await client.getCollection(collectionName);

        const vectors: typeof collection.config.params.vectors =
            collection.config.params.vectors;

        if (
            !vectors ||
            vectors.size !== dimensions ||
            vectors.distance !== 'Cosine'
        ) {
            throw new Error(
                `Коллекция ${collectionName} имеет несовместимые параметры векторов.`,
            );
        }

        if (
            collection.config.metadata?.embedding_model !== embeddingModel ||
            collection.config.metadata?.content_type !== 'news_summary'
        ) {
            throw new Error(
                `Коллекция ${collectionName} предназначена для другой модели или типа данных.`,
            );
        }
    }

    async upsertNewsVector(
        collectionName: string,
        point: NewsVectorPoint,
    ): Promise<void> {
        if (
            !Number.isSafeInteger(point.articleId) ||
            point.articleId <= 0
        ) {
            throw new Error('Некорректный ID статьи для индексации.');
        }

        if (!/^[a-f0-9]{64}$/.test(point.summaryHash)) {
            throw new Error('Некорректный хеш пересказа.');
        }

        if (
            point.embedding.length === 0 ||
            !point.embedding.every(
                (value: number): boolean => Number.isFinite(value),
            ) ||
            !point.embedding.some(
                (value: number): boolean => value !== 0,
            )
        ) {
            throw new Error('Некорректный вектор для Qdrant.');
        }

        const client: QdrantClient = this.getClient();

        const response: Awaited<
            ReturnType<QdrantClient['upsert']>
        > = await client.upsert(collectionName, {
            wait: true,
            points: [
                {
                    id: point.articleId,
                    vector: point.embedding,
                    payload: {
                        article_id: point.articleId,
                        summary_hash: point.summaryHash,
                    },
                },
            ],
        });

        if (response.status !== 'completed') {
            throw new Error(
                `Qdrant не подтвердил запись статьи ${point.articleId}.`,
            );
        }
    }

    async findSimilarNews(
        collectionName: string,
        articleId: number,
        limit: number = 5,
    ): Promise<SimilarNewsPoint[]> {
        if (
            !Number.isSafeInteger(articleId) ||
            articleId <= 0
        ) {
            throw new Error('Некорректный ID исходной статьи.');
        }

        if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 20
        ) {
            throw new Error('Лимит поиска должен быть от 1 до 20.');
        }

        const client: QdrantClient = this.getClient();

        const response: Awaited<
            ReturnType<QdrantClient['query']>
        > = await client.query(collectionName, {
            query: articleId,
            filter: {
                must_not: [
                    {
                        has_id: [articleId],
                    },
                ],
            },
            limit,
            with_payload: false,
            with_vector: false,
        });

        return response.points.map(
            (
                point: (typeof response.points)[number],
            ): SimilarNewsPoint => {
                const candidateId: number | string = point.id;

                if (
                    typeof candidateId !== 'number' ||
                    !Number.isSafeInteger(candidateId) ||
                    candidateId <= 0 ||
                    !Number.isFinite(point.score)
                ) {
                    throw new Error(
                        'Qdrant вернул некорректный результат поиска.',
                    );
                }

                return {
                    articleId: candidateId,
                    score: point.score,
                };
            },
        );
    }

    private getClient(): QdrantClient {
        if (this.client !== null) {
            return this.client;
        }

        const url: string = this.configService
            .getOrThrow<string>('QDRANT_URL')
            .trim();

        if (url.length === 0) {
            throw new Error('QDRANT_URL не должен быть пустым.');
        }

        this.client = new QdrantClient({
            url,
            timeout: 10_000,
            maxConnections: 1,
        });

        return this.client;
    }
}