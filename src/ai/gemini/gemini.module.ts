import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { GeminiClient } from './gemini.client';
import { GeminiEmbeddingClient } from './gemini-embedding.client';

@Module({
    imports: [ConfigModule],
    providers: [
        GeminiClient,
        GeminiEmbeddingClient,
    ],
    exports: [
        GeminiClient,
        GeminiEmbeddingClient,
    ],
})
export class GeminiModule {}