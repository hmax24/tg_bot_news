import { Module } from '@nestjs/common';
import { NewsArticlesModule } from '../news_article/news-articles.module';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotUpdate } from './telegram-bot.update';
import { NewsSubscriptionsModule } from '../news-subscription/news-subscriptions.module';
import { NewsTopicsModule } from '../news-topic/news-topics.module';
import { TelegramFormattingModule } from '../telegram-messaging/telegram-formatting.module';
import {NewsSearchModule} from "../news-search/news-search.module";
import {TelegramResearchService} from "./telegram-research.service";
import {ResearchModule} from "../research/research.module";

@Module({
  imports: [
    NewsArticlesModule,
    NewsSubscriptionsModule,
    NewsTopicsModule,
    TelegramFormattingModule,
    NewsSearchModule,
    ResearchModule,
  ],
  providers: [
    TelegramBotService,
    TelegramBotUpdate,
    TelegramResearchService,
  ],
})
export class TelegramBotModule {}
