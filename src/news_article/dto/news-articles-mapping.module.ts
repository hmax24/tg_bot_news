import { Module } from '@nestjs/common';

import { NewsArticlesMapper } from './news-articles.mapper';

@Module({
  providers: [NewsArticlesMapper],
  exports: [NewsArticlesMapper],
})
export class NewsArticlesMappingModule {}
