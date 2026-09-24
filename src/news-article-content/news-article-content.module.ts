import { Module } from '@nestjs/common';

import { DevToModule } from '../news_article/sources/dev-to/dev-to.module';
import { NewsArticleContentRepository } from './news-article-content.repository';
import { NewsArticleContentService } from './news-article-content.service';
import { NewsArticleContentLoader } from './news-article-content-loader.service';
import {GeminiModule} from "../ai/gemini/gemini.module";
import {NewsArticleSummaryService} from "./news-article-summary.service";
import {NewsArticleContentProcessor} from "./news-article-content-processor.service";
import {NewsArticleContentCompletionService} from "./news-article-content-completion.service";
import {NewsBroadcastModule} from "../news-broadcast/news-broadcast.module";
import {ConfigModule} from "@nestjs/config";
import {NewsArticleContentJob} from "./news-article-content.job";

@Module({
    imports: [
        DevToModule,
        GeminiModule,
        NewsBroadcastModule,
        ConfigModule,
    ],
    providers: [
        NewsArticleContentRepository,
        NewsArticleContentService,
        NewsArticleContentLoader,
        NewsArticleSummaryService,
        NewsArticleContentProcessor,
        NewsArticleContentCompletionService,
        NewsArticleContentJob,
    ],
    exports: [NewsArticleContentService],
})
export class NewsArticleContentModule {}