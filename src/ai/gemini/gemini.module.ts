import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { GeminiClient } from './gemini.client';

@Module({
    imports: [ConfigModule],
    providers: [GeminiClient],
    exports: [GeminiClient],
})
export class GeminiModule {}