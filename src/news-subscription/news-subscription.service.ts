import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { TelegramUser } from '../telegram-user/telegram-user.entity';
import { TelegramUsersService } from '../telegram-user/telegram-users.service';
import { NewsTopic } from '../news-topic/news-topic.entity';
import { NewsTopicsService } from '../news-topic/news-topics.service';
import { NewsSubscription } from './news-subscription.entity';
import { NewsSubscriptionRepository } from './news-subscription.repository';
import type { NewsTopicDto } from '../news-topic/dto/news-topic.dto';
import { NewsTopicsMapper } from '../news-topic/dto/news-topics.mapper';

@Injectable()
export class NewsSubscriptionService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly usersService: TelegramUsersService,
        private readonly topicsService: NewsTopicsService,
        private readonly repository: NewsSubscriptionRepository,
        private readonly topicsMapper: NewsTopicsMapper,
    ) {}

    async subscribe(
        telegramId: string,
        topicId: number,
    ): Promise<NewsTopicDto> {
        return this.dataSource.transaction(
            async (manager: EntityManager): Promise<NewsTopicDto> => {
                const topic: NewsTopic =
                    await this.topicsService.getActiveById(
                        topicId,
                        manager,
                    );

                const user: TelegramUser =
                    await this.usersService.getOrCreateByTelegramId(
                        telegramId,
                        manager,
                    );

                if (!user.isActive) {
                    throw new Error('Пользователь неактивен');
                }

                await this.repository.insertIfMissing(
                    user.id,
                    manager,
                );

                const lockedSubscription: NewsSubscription | null =
                    await this.repository.findForUpdate(
                        user.id,
                        manager,
                    );

                if (lockedSubscription === null) {
                    throw new Error('Не удалось создать подписку');
                }

                const subscription: NewsSubscription =
                    await this.repository.findWithTopics(
                        lockedSubscription.id,
                        manager,
                    );

                const alreadySubscribed: boolean =
                    subscription.newsTopics.some(
                        (existingTopic: NewsTopic): boolean =>
                            existingTopic.id === topic.id,
                    );

                if (!alreadySubscribed) {
                    subscription.newsTopics.push(topic);
                }

                subscription.isActive = true;

                await this.repository.save(
                    subscription,
                    manager,
                );

                return this.topicsMapper.mapToDto(topic)
            },
        );
    }

    async unsubscribe(
        telegramId: string,
        topicId: number,
    ): Promise<NewsTopicDto | null> {
        return this.dataSource.transaction(
            async (
                manager: EntityManager,
            ): Promise<NewsTopicDto | null> => {
                const user: TelegramUser | null =
                    await this.usersService.findByTelegramId(
                        telegramId,
                        manager,
                    );

                if (user === null) {
                    return null;
                }

                if (!user.isActive) {
                    throw new Error('Пользователь неактивен');
                }

                const lockedSubscription: NewsSubscription | null =
                    await this.repository.findForUpdate(
                        user.id,
                        manager,
                    );

                if (lockedSubscription === null) {
                    return null;
                }

                const subscription: NewsSubscription =
                    await this.repository.findWithTopics(
                        lockedSubscription.id,
                        manager,
                    );

                const removedTopic: NewsTopic | undefined =
                    subscription.newsTopics.find(
                        (topic: NewsTopic): boolean =>
                            topic.id === topicId,
                    );

                if (removedTopic === undefined) {
                    return null;
                }

                subscription.newsTopics =
                    subscription.newsTopics.filter(
                        (topic: NewsTopic): boolean =>
                            topic.id !== topicId,
                    );

                if (subscription.newsTopics.length === 0) {
                    subscription.isActive = false;
                }

                await this.repository.save(
                    subscription,
                    manager,
                );

                return this.topicsMapper.mapToDto(removedTopic);
            },
        );
    }

    async getSubscribedTopics(
        telegramId: string,
    ): Promise<NewsTopicDto[]> {
        const subscription: NewsSubscription | null =
            await this.repository.findActiveByTelegramId(
                telegramId,
            );

        if (subscription === null) {
            return [];
        }

        const topics: NewsTopic[] = subscription.newsTopics
            .filter(
                (topic: NewsTopic): boolean => topic.isActive,
            )
            .sort(
                (left: NewsTopic, right: NewsTopic): number =>
                    left.name.localeCompare(right.name),
            );
        return this.topicsMapper.mapToDtoList(topics);
    }
}
