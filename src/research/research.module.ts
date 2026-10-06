import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { GeminiModule } from '../ai/gemini/gemini.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { QdrantModule } from '../vector-store/qdrant/qdrant.module';
import { ResearchRepository } from './research.repository';
import { ResearchRetrievalService } from './research-retrieval.service';
import { ContextService } from "./context.service";
import { ResearchAnswerService } from './research-answer.service';
import {ResearchGraph} from "./graphs/research.graph";

@Module({
    imports: [
        ConfigModule,
        GeminiModule,
        IngestionModule,
        QdrantModule,
    ],
    providers: [
        ResearchRepository,
        ResearchRetrievalService,
        ContextService,
        ResearchAnswerService,
        ResearchGraph,
    ],
    exports: [
        ResearchGraph,
    ],
})
export class ResearchModule {}