import 'reflect-metadata';

import { Module } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { createDatabaseConfig } from '../database/database.config';
import { IngestionModule } from './ingestion.module';
import { ChunkCollectionService } from './chunk-collection.service';
import { NewsIngestionQueueService } from './news-ingestion-queue.service';
import { NewsIngestionProcessor } from './news-ingestion.processor';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: createDatabaseConfig,
        }),
        IngestionModule,
    ],
})
class IngestOnceModule {}

async function main(): Promise<void> {
    const app: INestApplicationContext =
        await NestFactory.createApplicationContext(
            IngestOnceModule,
            {
                logger: ['log', 'warn', 'error'],
                abortOnError: false,
            },
        );

    try {
        const collectionService: ChunkCollectionService =
            app.get(ChunkCollectionService);

        const queueService: NewsIngestionQueueService =
            app.get(NewsIngestionQueueService);

        const processor: NewsIngestionProcessor =
            app.get(NewsIngestionProcessor);

        await collectionService.ensureReady();

        const preparedArticleId: number | null =
            await queueService.prepareNext();

        console.log({ preparedArticleId });

        const processed: boolean = await processor.processNext();

        console.log({ processed });
    } finally {
        await app.close();
    }
}

main().catch((error: unknown): void => {
    console.error({
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error
            ? error.message
            : 'Неизвестная ошибка ingestion.',
    });

    process.exitCode = 1;
});