import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelegramUsersModule } from '../telegram-user/telegram-users.module';
import { NewsBroadcast } from './news-broadcast.entity';
import { NewsBroadcastRepository } from './news-broadcast.repository';
import { NewsBroadcastService } from './news-broadcast.service';
import {TelegramUser} from "../telegram-user/telegram-user.entity";
import {NewsBroadcastRecipientsRepository} from "./news-broadcast-recipients.repository";
import {TelegramMessagingModule} from "../telegram-messaging/telegram-messaging.module";
import {NewsBroadcastProcessor} from "./news-broadcast-processor.service";
import {NewsBroadcastJob} from "./news-broadcast.job";
import {NewsArticlesMapper} from "../news_article/dto/news-articles.mapper";
import {NewsArticlesFormatter} from "../telegram-bot/formatters/news-articles.formatter";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            NewsBroadcast,
            TelegramUser,
        ]),
        TelegramUsersModule,
        TelegramMessagingModule,
    ],
    providers: [
        NewsBroadcastRepository,
        NewsBroadcastService,
        NewsBroadcastRecipientsRepository,
        NewsBroadcastProcessor,
        NewsBroadcastJob,
        NewsArticlesMapper,
        NewsArticlesFormatter,
    ],
    exports: [
        NewsBroadcastService,
    ],
})
export class NewsBroadcastModule {}