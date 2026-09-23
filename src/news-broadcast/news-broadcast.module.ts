import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';

import {TelegramUsersModule} from '../telegram-user/telegram-users.module';
import {NewsBroadcast} from './news-broadcast.entity';
import {NewsBroadcastRepository} from './news-broadcast.repository';
import {NewsBroadcastService} from './news-broadcast.service';
import {TelegramUser} from "../telegram-user/telegram-user.entity";
import {NewsBroadcastRecipientsRepository} from "./news-broadcast-recipients.repository";
import {TelegramMessagingModule} from "../telegram-messaging/telegram-messaging.module";
import {NewsBroadcastProcessor} from "./news-broadcast-processor.service";
import {NewsBroadcastJob} from "./news-broadcast.job";
import {TelegramFormattingModule} from "../telegram-messaging/telegram-formatting.module";
import {NewsArticlesMappingModule} from "../news_article/dto/news-articles-mapping.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            NewsBroadcast,
            TelegramUser,
        ]),
        TelegramUsersModule,
        TelegramMessagingModule,
        NewsArticlesMappingModule,
        TelegramFormattingModule,
    ],
    providers: [
        NewsBroadcastRepository,
        NewsBroadcastService,
        NewsBroadcastRecipientsRepository,
        NewsBroadcastProcessor,
        NewsBroadcastJob,
    ],
    exports: [
        NewsBroadcastService,
    ],
})
export class NewsBroadcastModule {
}