import type {ConfigService} from '@nestjs/config';
import type {DataSourceOptions} from 'typeorm';
import {join} from 'node:path';
import {NewsArticle} from '../news_article/news-article.entity';
import {NewsSubscription} from '../news-subscription/news-subscription.entity';
import {NewsTopic} from '../news-topic/news-topic.entity';
import {TelegramUser} from '../telegram-user/telegram-user.entity';
import {NewsBroadcast} from '../news-broadcast/news-broadcast.entity';
import {NewsArticleContent} from "../news-article-content/news-article-content.entity";

export function createDatabaseConfig(
    configService: ConfigService,
): DataSourceOptions {
    const port: number = Number(configService.get<string>('DB_PORT', '5432'));

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('DB_PORT must be a valid port number');
    }

    return {
        type: 'postgres',
        host: configService.getOrThrow<string>('DB_HOST'),
        port,
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_DATABASE'),
        entities: [
            NewsArticle,
            NewsSubscription,
            NewsTopic,
            TelegramUser,
            NewsBroadcast,
            NewsArticleContent,
        ],
        migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
        synchronize: false,
        migrationsRun: false,
    };
}
