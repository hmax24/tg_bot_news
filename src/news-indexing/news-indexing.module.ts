import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { QdrantModule } from '../vector-store/qdrant/qdrant.module';
import { NewsVectorCollectionService } from './news-vector-collection.service';
import {NewsArticleIndexRepository} from "./news-article-index.repository";
import {NewsIndexingService} from "./news-indexing.service";
import {NewsIndexingProcessor} from "./news-indexing.processor";
import {GeminiModule} from "../ai/gemini/gemini.module";
import {NewsIndexingJob} from "./news-indexing.job";

@Module({
    imports: [
        ConfigModule,
        QdrantModule,
        GeminiModule,
    ],
    providers: [
        NewsVectorCollectionService,
        NewsArticleIndexRepository,
        NewsIndexingService,
        NewsIndexingProcessor,
        NewsIndexingJob,
    ],
    exports: [
        NewsVectorCollectionService,
    ],
})
export class NewsIndexingModule {}