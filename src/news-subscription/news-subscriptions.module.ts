import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelegramUsersModule } from '../telegram-user/telegram-users.module';
import { NewsTopicsModule } from '../news-topic/news-topics.module';
import { NewsSubscription } from './news-subscription.entity';
import { NewsSubscriptionController } from './news-subscription.controller';
import { NewsSubscriptionRepository } from './news-subscription.repository';
import { NewsSubscriptionService } from './news-subscription.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([NewsSubscription]),
        TelegramUsersModule,
        NewsTopicsModule,
    ],
    controllers: [
        NewsSubscriptionController,
    ],
    providers: [
        NewsSubscriptionRepository,
        NewsSubscriptionService,
    ],
    exports: [
        NewsSubscriptionService,
    ],
})
export class NewsSubscriptionsModule {}