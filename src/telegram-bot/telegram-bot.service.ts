import {Injectable, OnModuleInit} from '@nestjs/common';
import {InjectBot} from 'nestjs-telegraf';
import {Telegraf} from 'telegraf';
import {BOT_COMMANDS, DEFAULT_TOPICS} from './telegram-bot.constants';

@Injectable()
export class TelegramBotService implements OnModuleInit {
    private readonly userSubscriptions = new Map<string, Set<string>>();

    constructor(
        @InjectBot()
        private readonly bot: Telegraf,
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

    getTopics(): string[] {
        return DEFAULT_TOPICS;
    }

    getUserSubscriptions(telegramId: string): string[] {
        const subscriptions = this.userSubscriptions.get(telegramId);

        if (!subscriptions) {
            return [];
        }

        return Array.from(subscriptions);
    }

    subscribeToTopic(telegramId: string, topic: string): string {
        if (!this.isTopicExists(topic)) {
            return `Тема "${topic}" не найдена.`;
        }

        let subscriptions = this.userSubscriptions.get(telegramId);

        if (!subscriptions) {
            subscriptions = new Set<string>();
            this.userSubscriptions.set(telegramId, subscriptions);
        }

        if (subscriptions.has(topic)) {
            return `Ты уже подписан на тему: ${topic}`;
        }

        subscriptions.add(topic);

        return `Ты подписался на тему: ${topic}`;
    }

    unsubscribeFromTopic(telegramId: string, topic: string): string {
        const subscriptions = this.userSubscriptions.get(telegramId);

        if (!subscriptions || subscriptions.size === 0) {
            return 'У тебя пока нет активных подписок.';
        }

        if (!subscriptions.has(topic)) {
            return `Ты не был подписан на тему: ${topic}`;
        }

        subscriptions.delete(topic);

        if (subscriptions.size === 0) {
            this.userSubscriptions.delete(telegramId);
        }

        return `Ты отписался от темы: ${topic}`;
    }

    getMySubscriptionsMessage(telegramId: string): string {
        const subscriptions = this.getUserSubscriptions(telegramId);

        if (subscriptions.length === 0) {
            return 'У тебя пока нет подписок. Нажми "📰 Темы новостей" и выбери интересующие темы.';
        }

        return `
Твои подписки:

${subscriptions.map((topic) => `✅ ${topic}`).join('\n')}
`;
    }

    getUnsubscribeMessage(telegramId: string): string {
        const subscriptions = this.getUserSubscriptions(telegramId);

        if (subscriptions.length === 0) {
            return 'У тебя пока нет подписок, от которых можно отписаться.';
        }

        return 'Выбери тему, от которой хочешь отписаться:';
    }

    getLatestNewsMessage(): string {
        return 'Пока новости не подключены. Позже здесь будут последние IT-новости по твоим темам.';
    }

    private isTopicExists(topic: string): boolean {
        return DEFAULT_TOPICS.includes(topic);
    }
}