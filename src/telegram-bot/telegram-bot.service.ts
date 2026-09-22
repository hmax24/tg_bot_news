import {Injectable, OnModuleInit} from '@nestjs/common';
import {InjectBot} from 'nestjs-telegraf';
import {Telegraf} from 'telegraf';
import {BOT_COMMANDS} from './telegram-bot.constants';
import {NewsArticlesFormatter} from "./formatters/news-articles.formatter";
import {NewsArticlesService} from "../news_article/news-articles.service";
import {NewsArticleDto} from "../news_article/dto/news-article.dto";
import {NewsTopicsService} from "../news-topic/news-topics.service";
import {NewsSubscriptionService} from "../news-subscription/news-subscription.service";
import type { NewsTopicDto } from '../news-topic/dto/news-topic.dto';

@Injectable()
export class TelegramBotService implements OnModuleInit {

    constructor(
        @InjectBot()
        private readonly bot: Telegraf,
        private readonly newsArticlesService: NewsArticlesService,
        private readonly newsArticlesFormatter: NewsArticlesFormatter,
        private readonly newsTopicsService: NewsTopicsService,
        private readonly newsSubscriptionService: NewsSubscriptionService,
    ) {
    }

    async onModuleInit() {
        await this.bot.telegram.setMyCommands(BOT_COMMANDS);
    }

    getWelcomeMessage(firstName?: string): string {
        return `
Привет${firstName ? `, ${firstName}` : ''}! 👋

Я бот для подписки на IT-новости.

Ты можешь выбрать темы, получать новости и управлять своими подписками.

Выбери действие в меню ниже 👇
`;
    }

    getHelpMessage(): string {
        return `
Доступные команды:

/start — запустить бота
/topics — показать темы новостей
/my_subscriptions — показать мои подписки
/unsubscribe — отписаться от темы
/latest — последние новости
/help — помощь
`;
    }

    async getTopics(): Promise<NewsTopicDto[]> {
        return this.newsTopicsService.getAllActive();
    }

    async getUserSubscriptions(
        telegramId: string,
    ): Promise<NewsTopicDto[]> {
        return this.newsSubscriptionService.getSubscribedTopics(
            telegramId,
        );
    }

    async subscribeToTopic(
        telegramId: string,
        topicId: number,
    ): Promise<string> {
        await this.newsSubscriptionService.subscribe(
            telegramId,
            topicId,
        );

        return 'Подписка сохранена.';
    }

    async unsubscribeFromTopic(
        telegramId: string,
        topicId: number,
    ): Promise<string> {
        const topics: NewsTopicDto[] =
            await this.newsSubscriptionService.getSubscribedTopics(
                telegramId,
            );

        const topic: NewsTopicDto | undefined = topics.find(
            (item: NewsTopicDto): boolean => item.id === topicId,
        );

        await this.newsSubscriptionService.unsubscribe(
            telegramId,
            topicId,
        );

        if (topic === undefined) {
            return 'Активной подписки на эту тему уже нет.';
        }

        const topicName: string = topic.name;

        return `Подписка на тему «${topicName}» отключена.`;
    }

    async getMySubscriptionsMessage(
        telegramId: string,
    ): Promise<string> {
        const topics: NewsTopicDto[] =
            await this.getUserSubscriptions(telegramId);

        if (topics.length === 0) {
            return 'У тебя пока нет подписок. Открой «📰 Темы новостей».';
        }

        const names: string = topics
            .map(
                (topic: NewsTopicDto): string => `✅ ${topic.name}`,
            )
            .join('\n');

        return `Твои подписки:\n\n${names}`;
    }

    async getLatestNewsMessages(
        telegramId: string,
    ): Promise<string[]> {
        const topics: NewsTopicDto[] =
            await this.getUserSubscriptions(telegramId);

        if (topics.length === 0) {
            return [
                'Сначала выбери интересующие темы в разделе «📰 Темы новостей».',
            ];
        }

        const topicIds: number[] = topics.map(
            (topic: NewsTopicDto): number => topic.id,
        );

        const articles: NewsArticleDto[] =
            await this.newsArticlesService.getLatestArticlesByTopicIds(
                topicIds,
            );

        if (articles.length === 0) {
            return ['По твоим подпискам пока нет сохранённых публикаций.'];
        }

        return articles.map(
            (article: NewsArticleDto): string =>
                this.newsArticlesFormatter.format(article),
        );
    }
}