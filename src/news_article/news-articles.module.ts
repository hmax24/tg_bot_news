import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsTopicsModule } from '../news-topic/news-topics.module';
import { NewsArticle } from './news-article.entity';
import { NewsArticlesRepository } from './news-articles.repository';
import { NewsArticlesService } from './news-articles.service';
import { DevToArticlesMapper } from './sources/dev-to/dev-to-articles.mapper';
import { NewsArticlesImport } from './news-articles.import';

import { NewsArticlesMappingModule } from './dto/news-articles-mapping.module';
import {NewsArticleContentModule} from "../news-article-content/news-article-content.module";
import {DevToModule} from "./sources/dev-to/dev-to.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsArticle]),
    NewsTopicsModule,
    NewsArticlesMappingModule,
    NewsArticleContentModule,
    DevToModule
  ],
  providers: [
    NewsArticlesService,
    NewsArticlesRepository,
    NewsArticlesImport,
    DevToArticlesMapper,
  ],
  exports: [NewsArticlesService],
})
export class NewsArticlesModule {}
