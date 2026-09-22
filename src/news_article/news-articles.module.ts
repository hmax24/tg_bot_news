import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';

import {NewsTopicsModule} from '../news-topic/news-topics.module';
import {NewsArticle} from './news-article.entity';
import {NewsArticlesController} from './news-articles.controller';
import {NewsArticlesRepository} from './news-articles.repository';
import {NewsArticlesService} from './news-articles.service';
import {DevToClient} from './sources/dev-to/dev-to-client';
import {DevToArticlesMapper} from './sources/dev-to/dev-to-articles.mapper';
import {NewsArticlesMapper} from "./dto/news-articles.mapper";
import {NewsArticlesImport} from "./news-articles.import";
import {NewsBroadcastModule} from "../news-broadcast/news-broadcast.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([NewsArticle]),
        NewsTopicsModule,
        NewsBroadcastModule,
    ],
    controllers: [
        NewsArticlesController,
    ],
    providers: [
        NewsArticlesService,
        NewsArticlesRepository,
        NewsArticlesImport,
        DevToClient,
        DevToArticlesMapper,
        NewsArticlesMapper
    ],
    exports: [NewsArticlesService],
})
export class NewsArticlesModule {
}