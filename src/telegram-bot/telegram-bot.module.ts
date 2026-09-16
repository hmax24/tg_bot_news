import { Module } from '@nestjs/common';
import { NewsArticlesModule } from '../news_article/news-articles.module';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotUpdate } from './telegram-bot.update';
import { NewsArticlesFormatter } from './formatters/news-articles.formatter';
import {NewsSubscriptionsModule} from "../news-subscription/news-subscriptions.module";
import {NewsTopicsModule} from "../news-topic/news-topics.module";

@Module({
    imports: [
        NewsArticlesModule,
        NewsSubscriptionsModule,
        NewsTopicsModule,
    ],
    providers: [
        TelegramBotService,
        TelegramBotUpdate,
        NewsArticlesFormatter,
    ],
})
export class TelegramBotModule {}