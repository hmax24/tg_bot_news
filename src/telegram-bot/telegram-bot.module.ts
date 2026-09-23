import { Module } from '@nestjs/common';
import { NewsArticlesModule } from '../news_article/news-articles.module';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotUpdate } from './telegram-bot.update';
import {NewsSubscriptionsModule} from "../news-subscription/news-subscriptions.module";
import {NewsTopicsModule} from "../news-topic/news-topics.module";
import {TelegramFormattingModule} from "../telegram-messaging/telegram-formatting.module";

@Module({
    imports: [
        NewsArticlesModule,
        NewsSubscriptionsModule,
        NewsTopicsModule,
        TelegramFormattingModule
    ],
    providers: [
        TelegramBotService,
        TelegramBotUpdate,
    ],
})
export class TelegramBotModule {}