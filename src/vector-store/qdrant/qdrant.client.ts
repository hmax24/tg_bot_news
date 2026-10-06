import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import {NewsVectorPoint} from "./interfaces/news-vector-point.interface";
import {SimilarNewsPoint} from "./interfaces/similar-news-point.interface";
import {ChunkingConfig} from "./interfaces/chunking-config";
import {NewsChunkPoint} from "./interfaces/news-chunk-point";
import {NewsChunkSearchResult} from "./interfaces/news-chunk-search-result";

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
        chunking?: ChunkingConfig,
    ): Promise<void> {

        if (
            chunking !== undefined &&
            (
                !Number.isSafeInteger(chunking.size) ||
                chunking.size <= 0 ||
                !Number.isSafeInteger(chunking.overlap) ||
                chunking.overlap < 0 ||
                chunking.overlap >= chunking.size
            )
        ) {
            throw new Error('Некорректные настройки чанкинга.');
        }

        const contentType: string = chunking === undefined
            ? 'news_summary'
            : 'news_summary_chunk';

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
                    content_type: contentType,
                    ...(chunking === undefined
                        ? {}
                        : {
                            chunk_size: chunking.size,
                            chunk_overlap: chunking.overlap,
                            chunk_unit: 'unicode_code_points',
                        }),
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
            chunking !== undefined &&
            (
                collection.config.metadata?.chunk_size !== chunking.size ||
                collection.config.metadata?.chunk_overlap !== chunking.overlap ||
                collection.config.metadata?.chunk_unit !== 'unicode_code_points'
            )
        ) {
            throw new Error(
                `Коллекция ${collectionName} имеет другие настройки чанкинга.`,
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

    async upsertNewsChunk(
        collectionName: string,
        point: NewsChunkPoint,
    ): Promise<void> {
        if (
            !/^[a-f0-9]{8}-[a-f0-9]{4}-8[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
                .test(point.pointId)
        ) {
            throw new Error('Некорректный UUID чанка.');
        }

        if (
            !Number.isSafeInteger(point.articleId) ||
            point.articleId <= 0 ||
            !Number.isSafeInteger(point.index) ||
            point.index < 0
        ) {
            throw new Error('Некорректный ID статьи или индекс чанка.');
        }

        if (!/^[a-f0-9]{64}$/.test(point.summaryHash)) {
            throw new Error('Некорректный хеш пересказа.');
        }

        const textLength: number = Array.from(point.text).length;

        if (
            point.text.trim().length === 0 ||
            !Number.isSafeInteger(point.startOffset) ||
            !Number.isSafeInteger(point.endOffset) ||
            point.startOffset < 0 ||
            point.endOffset <= point.startOffset ||
            point.endOffset - point.startOffset !== textLength
        ) {
            throw new Error('Некорректный текст или границы чанка.');
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
            throw new Error('Некорректный embedding чанка.');
        }

        const client: QdrantClient = this.getClient();

        const response: Awaited<
            ReturnType<QdrantClient['upsert']>
        > = await client.upsert(collectionName, {
            wait: true,
            points: [
                {
                    id: point.pointId,
                    vector: point.embedding,
                    payload: {
                        article_id: point.articleId,
                        summary_hash: point.summaryHash,
                        chunk_index: point.index,
                        text: point.text,
                        start_offset: point.startOffset,
                        end_offset: point.endOffset,
                    },
                },
            ],
        });

        if (response.status !== 'completed') {
            throw new Error(
                `Qdrant не подтвердил запись чанка ${point.pointId}.`,
            );
        }
    }

    async searchNewsChunks(
        collectionName: string,
        embedding: number[],
        limit: number = 10,
    ): Promise<NewsChunkSearchResult[]> {
        if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 20
        ) {
            throw new Error('Лимит поиска должен быть от 1 до 20.');
        }

        if (
            embedding.length === 0 ||
            !embedding.every(
                (value: number): boolean => Number.isFinite(value),
            ) ||
            !embedding.some(
                (value: number): boolean => value !== 0,
            )
        ) {
            throw new Error('Некорректный вектор поискового запроса.');
        }

        const client: QdrantClient = this.getClient();

        const response: Awaited<
            ReturnType<QdrantClient['query']>
        > = await client.query(collectionName, {
            query: embedding,
            limit,
            with_payload: true,
            with_vector: false,
        });

        return response.points.map(
            (
                point: (typeof response.points)[number],
            ): NewsChunkSearchResult => {
                const payload: Record<string, unknown> | null | undefined =
                    point.payload;

                const articleId: unknown = payload?.article_id;
                const summaryHash: unknown = payload?.summary_hash;
                const index: unknown = payload?.chunk_index;
                const text: unknown = payload?.text;
                const startOffset: unknown = payload?.start_offset;
                const endOffset: unknown = payload?.end_offset;

                if (
                    typeof point.id !== 'string' ||
                    point.id.length === 0 ||
                    !Number.isFinite(point.score) ||
                    typeof articleId !== 'number' ||
                    !Number.isSafeInteger(articleId) ||
                    articleId <= 0 ||
                    typeof summaryHash !== 'string' ||
                    !/^[a-f0-9]{64}$/.test(summaryHash) ||
                    typeof index !== 'number' ||
                    !Number.isSafeInteger(index) ||
                    index < 0 ||
                    typeof text !== 'string' ||
                    text.trim().length === 0 ||
                    typeof startOffset !== 'number' ||
                    !Number.isSafeInteger(startOffset) ||
                    startOffset < 0 ||
                    typeof endOffset !== 'number' ||
                    !Number.isSafeInteger(endOffset) ||
                    endOffset <= startOffset
                ) {
                    throw new Error(
                        'Qdrant вернул чанк с некорректными метаданными.',
                    );
                }

                if (
                    Array.from(text).length !== endOffset - startOffset
                ) {
                    throw new Error(
                        'Длина текста чанка не соответствует его границам.',
                    );
                }

                return {
                    pointId: point.id,
                    articleId,
                    summaryHash,
                    index,
                    text,
                    startOffset,
                    endOffset,
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