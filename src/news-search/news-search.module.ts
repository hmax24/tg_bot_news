import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';

import {NewsArticlesMappingModule} from '../news_article/dto/news-articles-mapping.module';
import {QdrantModule} from '../vector-store/qdrant/qdrant.module';
import {NewsSearchRepository} from './news-search.repository';
import {SimilarNewsGraph} from './graphs/similar-news.graph';
import {NewsSearchService} from "./news-search.service";

@Module({
    imports: [
        ConfigModule,
        QdrantModule,
        NewsArticlesMappingModule,

    ],
    providers: [
        NewsSearchRepository,
        SimilarNewsGraph,
        NewsSearchService,
    ],
    exports: [
        SimilarNewsGraph,
        NewsSearchService,
    ],
})
export class NewsSearchModule {
}