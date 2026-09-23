import {Action, Command, Ctx, Help, Hears, Start, Update} from 'nestjs-telegraf';
import {Context} from 'telegraf';
import {TelegramBotService} from './telegram-bot.service';
import {TelegramBotKeyboards} from './telegram-bot.keyboards';
import {BOT_BUTTONS, CALLBACK_PREFIXES} from './telegram-bot.constants';
import {Logger} from "@nestjs/common";
import type { NewsTopicDto } from '../news-topic/dto/news-topic.dto';
import {TopicCallbackValidator} from "./validation/topic-callback.validator";

@Update()
export class TelegramBotUpdate {
    constructor(
        private readonly telegramBotService: TelegramBotService,
    ) {
    }

    private readonly logger: Logger =
        new Logger(TelegramBotUpdate.name);

    @Start()
    async start(@Ctx() ctx: Context): Promise<void> {
        const firstName: string | undefined = ctx.from?.first_name;

        await ctx.reply(
            this.telegramBotService.getWelcomeMessage(firstName),
            TelegramBotKeyboards.getMainMenuKeyboard(),
        );
    }

    @Help()
    async help(@Ctx() ctx: Context): Promise<void> {
        await ctx.reply(
            this.telegramBotService.getHelpMessage(),
            TelegramBotKeyboards.getMainMenuKeyboard(),
        );
    }

    @Command('topics')
    async topics(@Ctx() ctx: Context): Promise<void> {
        const telegramId: string | null = this.getTelegramId(ctx);

        if (telegramId === null) {
            await ctx.reply('Не удалось определить пользователя.');
            return;
        }

        const topics: NewsTopicDto[] =
            await this.telegramBotService.getTopics();

        if (topics.length === 0) {
            await ctx.reply('Доступных тем пока нет.');
            return;
        }

        const subscriptions: NewsTopicDto[] =
            await this.telegramBotService.getUserSubscriptions(
                telegramId,
            );

        const subscribedTopicIds: number[] = subscriptions.map(
            (topic: NewsTopicDto): number => topic.id,
        );

        await ctx.reply(
            'Выбери темы:',
            TelegramBotKeyboards.getTopicsKeyboard(
                topics,
                subscribedTopicIds,
            ),
        );
    }

    @Command('my_subscriptions')
    async mySubscriptions(@Ctx() ctx: Context): Promise<void> {
        const telegramId: string | null = this.getTelegramId(ctx);

        if (telegramId === null) {
            await ctx.reply('Не удалось определить пользователя.');
            return;
        }

        const message: string =
            await this.telegramBotService.getMySubscriptionsMessage(
                telegramId,
            );

        await ctx.reply(message);
    }

    @Command('unsubscribe')
    async unsubscribe(@Ctx() ctx: Context): Promise<void> {
        const telegramId: string | null = this.getTelegramId(ctx);

        if (telegramId === null) {
            await ctx.reply('Не удалось определить пользователя.');
            return;
        }

        const topics: NewsTopicDto[] =
            await this.telegramBotService.getUserSubscriptions(
                telegramId,
            );

        if (topics.length === 0) {
            await ctx.reply('У тебя пока нет активных подписок.');
            return;
        }

        await ctx.reply(
            'Выбери тему для отписки:',
            TelegramBotKeyboards.getUnsubscribeKeyboard(topics),
        );
    }

    @Command('latest')
    async latest(@Ctx() ctx: Context): Promise<void> {
        let messages: string[];

        try {
            const telegramId: string | null = this.getTelegramId(ctx);

            if (telegramId === null) {
                await ctx.reply('Не удалось определить пользователя.');
                return;
            }
            messages =
                await this.telegramBotService.getLatestNewsMessages(
                    telegramId,
                );
        } catch (error: unknown) {
            const message: string =
                error instanceof Error
                    ? error.message
                    : 'Unknown error';

            this.logger.error(
                `Failed to load latest articles: ${message}`,
            );

            await ctx.reply(
                'Не удалось загрузить новости. Попробуй позже.',
            );

            return;
        }

        for (
            let index: number = 0;
            index < messages.length;
            index++
        ) {
            const message: string = messages[index];

            await ctx.reply(
                message,
                TelegramBotKeyboards.getMainMenuKeyboard(),
            );
        }
    }

    @Hears(BOT_BUTTONS.TOPICS)
    async topicsButton(@Ctx() ctx: Context): Promise<void> {
        await this.topics(ctx);
    }

    @Hears(BOT_BUTTONS.MY_SUBSCRIPTIONS)
    async mySubscriptionsButton(@Ctx() ctx: Context): Promise<void> {
        await this.mySubscriptions(ctx);
    }

    @Hears(BOT_BUTTONS.UNSUBSCRIBE)
    async unsubscribeButton(@Ctx() ctx: Context): Promise<void> {
        await this.unsubscribe(ctx);
    }

    @Hears(BOT_BUTTONS.HELP)
    async helpButton(@Ctx() ctx: Context): Promise<void> {
        await this.help(ctx);
    }

    @Action(/^subscribe_topic:(.+)$/)
    async selectTopic(@Ctx() ctx: Context): Promise<void> {
        const telegramId: string | null = this.getTelegramId(ctx);
        const callbackData: string | null = this.getCallbackData(ctx);

        const topicId: number | null = callbackData === null
            ? null
            : TopicCallbackValidator.parseTopicId(
                callbackData,
                CALLBACK_PREFIXES.SUBSCRIBE_TOPIC,
            );

        if (telegramId === null || topicId === null) {
            await ctx.answerCbQuery('Открой список тем заново.');
            return;
        }

        await ctx.answerCbQuery();

        try {
            const message: string =
                await this.telegramBotService.subscribeToTopic(
                    telegramId,
                    topicId,
                );

            await ctx.reply(message);
        } catch (error: unknown) {
            const message: string = error instanceof Error
                ? error.message
                : 'Unknown subscription error';

            this.logger.error(message);

            await ctx.reply(
                'Не удалось подписаться. Обнови список тем и попробуй ещё раз.',
            );
        }
    }

    @Action(/^unsubscribe_topic:(.+)$/)
    async unsubscribeFromTopic(@Ctx() ctx: Context): Promise<void> {
        const telegramId: string | null = this.getTelegramId(ctx);
        const callbackData: string | null = this.getCallbackData(ctx);

        const topicId: number | null = callbackData === null
            ? null
            : TopicCallbackValidator.parseTopicId(
                callbackData,
                CALLBACK_PREFIXES.UNSUBSCRIBE_TOPIC,
            );

        if (telegramId === null || topicId === null) {
            await ctx.answerCbQuery('Открой список подписок заново.');
            return;
        }

        await ctx.answerCbQuery();

        try {
            const message: string =
                await this.telegramBotService.unsubscribeFromTopic(
                    telegramId,
                    topicId,
                );

            await ctx.reply(message);
        } catch (error: unknown) {
            const message: string = error instanceof Error
                ? error.message
                : 'Unknown unsubscribe error';

            this.logger.error(message);

            await ctx.reply(
                'Не удалось отписаться. Попробуй ещё раз.',
            );
        }
    }

    private getTelegramId(ctx: Context): string | null {
        if (!ctx.from?.id) {
            return null;
        }

        return String(ctx.from.id);
    }

    private getCallbackData(ctx: Context): string | null {
        const callbackQuery: Context['callbackQuery'] =
            ctx.callbackQuery;

        if (!callbackQuery || !('data' in callbackQuery)) {
            return null;
        }

        return callbackQuery.data;
    }
}