import 'reflect-metadata';

import { Module } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { createDatabaseConfig } from '../database/database.config';
import { ResearchModule } from './research.module';
import { ResearchGraph } from './graphs/research.graph';
import type { ResearchAnswer } from './types/research-answer';

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
        ResearchModule,
    ],
})
class ResearchOnceModule {}

async function main(): Promise<void> {
    const question: string = process.argv.slice(2).join(' ').trim();

    if (
        question.length === 0 ||
        Array.from(question).length > 2000
    ) {
        throw new Error(
            'Передай вопрос длиной от 1 до 2000 символов.',
        );
    }

    const app: INestApplicationContext =
        await NestFactory.createApplicationContext(
            ResearchOnceModule,
            {
                logger: ['log', 'warn', 'error'],
                abortOnError: false,
            },
        );

    try {
        const graph: ResearchGraph = app.get(ResearchGraph);

        const result: ResearchAnswer =
            await graph.research(question);

        console.log('\nОтвет:\n');
        console.log(result.answer);
        console.log('\nИсточники:', result.sourceArticleIds);
    } finally {
        await app.close();
    }
}

main().catch((error: unknown): void => {
    console.error({
        name: error instanceof Error
            ? error.name
            : 'UnknownError',
        message: error instanceof Error
            ? error.message
            : 'Неизвестная ошибка исследования.',
    });

    process.exitCode = 1;
});