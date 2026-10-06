import { Module } from '@nestjs/common';

import { GeminiModule } from '../ai/gemini/gemini.module';
import { QdrantModule } from './qdrant/qdrant.module';
import { NewsChunkStorageService } from './news-chunk-storage.service';

@Module({
    imports: [
        GeminiModule,
        QdrantModule,
    ],
    providers: [
        NewsChunkStorageService,
    ],
    exports: [
        NewsChunkStorageService,
    ],
})
export class NewsChunkStorageModule {}