import {Module} from '@nestjs/common';
import {NewsArticlesModule} from "./news_article/news_articles.module";
import {NewsSubscriptionsModule} from "./news_subscription/news_subscriptions.module";
import {NewsTopicsModule} from "./news-topic/news-topics.module";
import {TelegramUsersModule} from "./telegram_user/telegram_users.module";
import {TypeOrmModule} from "@nestjs/typeorm";


@Module({
    imports: [
        NewsArticlesModule,
        NewsSubscriptionsModule,
        NewsTopicsModule,
        TelegramUsersModule,
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'qwerty007',
            database: 'tg_bot_news',
            autoLoadEntities: true,
            synchronize: true,
        })
    ],
    controllers: [],
    providers: [],
})

export class AppModule {}
