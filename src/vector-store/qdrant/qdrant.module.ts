import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { QdrantStorageClient } from './qdrant.client';

@Module({
    imports: [ConfigModule],
    providers: [QdrantStorageClient],
    exports: [QdrantStorageClient],
})
export class QdrantModule {}