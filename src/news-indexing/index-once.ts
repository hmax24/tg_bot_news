import 'reflect-metadata';

import { Module } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDatabaseConfig } from '../database/database.config';
import { NewsIndexingModule } from './news-indexing.module';
import { NewsIndexingProcessor } from './news-indexing.processor';
import { NewsVectorCollectionService } from './news-vector-collection.service';

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
        NewsIndexingModule,
    ],
})
class IndexOnceModule {}

async function main(): Promise<void> {
    const app: INestApplicationContext =
        await NestFactory.createApplicationContext(
            IndexOnceModule,
            {
                logger: ['log', 'warn', 'error'],
                abortOnError: false,
            },
        );

    try {
        const collectionService: NewsVectorCollectionService =
            app.get(NewsVectorCollectionService);

        const processor: NewsIndexingProcessor =
            app.get(NewsIndexingProcessor);

        // Проверяем доступность и параметры Qdrant
        // до создания задания.
        await collectionService.ensureReady();

        for (let attempt: number = 1; attempt <= 2; attempt += 1) {
            const processed: boolean = await processor.processNext();

            console.log({ attempt, processed });

            if (!processed) {
                break;
            }
        }
    } finally {
        await app.close();
    }
}

main().catch((error: unknown): void => {
    console.error({
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error
            ? error.message
            : 'Неизвестная ошибка индексации.',
    });

    process.exitCode = 1;
});