import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ChunkingService } from './chunking.service';
import {IngestionService} from "./ingestion.service";
import {ChunkCollectionService} from "./chunk-collection.service";
import {QdrantModule} from "../vector-store/qdrant/qdrant.module";
import {NewsChunkStorageModule} from "../vector-store/news-chunk-storage.module";
import { NewsIngestionRepository } from "./news-ingestion.repository";
import { NewsIngestionQueueService } from "./news-ingestion-queue.service";
import {NewsIngestionProcessor} from "./news-ingestion.processor";
import { NewsIngestionJob } from "./news-ingestion.job";

@Module({
    imports: [
        ConfigModule,
        QdrantModule,
        NewsChunkStorageModule,
    ],
    providers: [
        ChunkingService,
        IngestionService,
        ChunkCollectionService,
        NewsIngestionRepository,
        NewsIngestionQueueService,
        NewsIngestionProcessor,
        NewsIngestionJob,
    ],
    exports: [
        ChunkingService,
        IngestionService,
        ChunkCollectionService,
    ],
})
export class IngestionModule {}