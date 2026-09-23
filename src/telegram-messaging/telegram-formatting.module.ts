import { Module } from '@nestjs/common';

import { NewsArticlesFormatter } from './formatters/news-articles.formatter';

@Module({
    providers: [NewsArticlesFormatter],
    exports: [NewsArticlesFormatter],
})
export class TelegramFormattingModule {}