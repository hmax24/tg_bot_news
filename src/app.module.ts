import {Module} from '@nestjs/common';
import {NewsArticlesModule} from "./news_article/news-articles.module";
import {NewsSubscriptionsModule} from "./news-subscription/news-subscriptions.module";
import {NewsTopicsModule} from "./news-topic/news-topics.module";
import {TelegramUsersModule} from "./telegram-user/telegram-users.module";
import {TypeOrmModule} from "@nestjs/typeorm";
import {TelegrafModule} from "nestjs-telegraf";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {createDatabaseConfig} from './database/database.config';
import {TelegramBotModule} from "./telegram-bot/telegram-bot.module";
import {ScheduleModule} from "@nestjs/schedule";


@Module({
    imports: [
        NewsArticlesModule,
        NewsSubscriptionsModule,
        NewsTopicsModule,
        TelegramUsersModule,
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: createDatabaseConfig,
        }),

        TelegrafModule.forRoot({
            token: process.env.TELEGRAM_BOT_TOKEN!,
        }),
        TelegramBotModule,
    ],
    controllers: [],
    providers: [],
})

export class AppModule {
}
