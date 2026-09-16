import { Action, Command, Ctx, Help, Hears, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotKeyboards } from './telegram-bot.keyboards';
import { BOT_BUTTONS, CALLBACK_PREFIXES } from './telegram-bot.constants';

@Update()
export class TelegramBotUpdate {
    constructor(
        private readonly telegramBotService: TelegramBotService,
    ) {}

    @Start()
    async start(@Ctx() ctx: Context) {
        const firstName = ctx.from?.first_name;

        await ctx.reply(
            this.telegramBotService.getWelcomeMessage(firstName),
            TelegramBotKeyboards.getMainMenuKeyboard(),
        );
    }

    @Help()
    async help(@Ctx() ctx: Context) {
        await ctx.reply(
            this.telegramBotService.getHelpMessage(),
            TelegramBotKeyboards.getMainMenuKeyboard(),
        );
    }

    @Command('topics')
    async topics(@Ctx() ctx: Context) {
        const telegramId = this.getTelegramId(ctx);

        if (!telegramId) {
            await ctx.reply('Не удалось определить пользователя Telegram.');
            return;
        }

        const topics = this.telegramBotService.getTopics();
        const subscribedTopics = this.telegramBotService.getUserSubscriptions(telegramId);

        await ctx.reply(
            'Выбери интересующую тему новостей:',
            TelegramBotKeyboards.getTopicsKeyboard(topics, subscribedTopics),
        );
    }

    @Command('my_subscriptions')
    async mySubscriptions(@Ctx() ctx: Context) {
        const telegramId = this.getTelegramId(ctx);

        if (!telegramId) {
            await ctx.reply('Не удалось определить пользователя Telegram.');
            return;
        }

        await ctx.reply(
            this.telegramBotService.getMySubscriptionsMessage(telegramId),
            TelegramBotKeyboards.getMainMenuKeyboard(),
        );
    }

    @Command('unsubscribe')
    async unsubscribe(@Ctx() ctx: Context) {
        const telegramId = this.getTelegramId(ctx);

        if (!telegramId) {
            await ctx.reply('Не удалось определить пользователя Telegram.');
            return;
        }

        const subscribedTopics = this.telegramBotService.getUserSubscriptions(telegramId);

        if (subscribedTopics.length === 0) {
            await ctx.reply(
                this.telegramBotService.getUnsubscribeMessage(telegramId),
                TelegramBotKeyboards.getMainMenuKeyboard(),
            );
            return;
        }

        await ctx.reply(
            this.telegramBotService.getUnsubscribeMessage(telegramId),
            TelegramBotKeyboards.getUnsubscribeKeyboard(subscribedTopics),
        );
    }

    @Command('latest')
    async latest(@Ctx() ctx: Context) {
        await ctx.reply(
            this.telegramBotService.getLatestNewsMessage(),
            TelegramBotKeyboards.getMainMenuKeyboard(),
        );
    }

    @Hears(BOT_BUTTONS.TOPICS)
    async topicsButton(@Ctx() ctx: Context) {
        await this.topics(ctx);
    }

    @Hears(BOT_BUTTONS.MY_SUBSCRIPTIONS)
    async mySubscriptionsButton(@Ctx() ctx: Context) {
        await this.mySubscriptions(ctx);
    }

    @Hears(BOT_BUTTONS.UNSUBSCRIBE)
    async unsubscribeButton(@Ctx() ctx: Context) {
        await this.unsubscribe(ctx);
    }

    @Hears(BOT_BUTTONS.HELP)
    async helpButton(@Ctx() ctx: Context) {
        await this.help(ctx);
    }

    @Action(/^subscribe_topic:(.+)$/)
    async selectTopic(@Ctx() ctx: Context) {
        const telegramId = this.getTelegramId(ctx);

        if (!telegramId) {
            await ctx.reply('Не удалось определить пользователя Telegram.');
            return;
        }

        const callbackData = this.getCallbackData(ctx);

        if (!callbackData) {
            return;
        }

        const topic = callbackData.replace(CALLBACK_PREFIXES.SUBSCRIBE_TOPIC, '');
        const message = this.telegramBotService.subscribeToTopic(telegramId, topic);

        await ctx.answerCbQuery();

        await ctx.reply(
            message,
            TelegramBotKeyboards.getMainMenuKeyboard(),
        );
    }

    @Action(/^unsubscribe_topic:(.+)$/)
    async unsubscribeFromTopic(@Ctx() ctx: Context) {
        const telegramId = this.getTelegramId(ctx);

        if (!telegramId) {
            await ctx.reply('Не удалось определить пользователя Telegram.');
            return;
        }

        const callbackData = this.getCallbackData(ctx);

        if (!callbackData) {
            return;
        }

        const topic = callbackData.replace(CALLBACK_PREFIXES.UNSUBSCRIBE_TOPIC, '');
        const message = this.telegramBotService.unsubscribeFromTopic(telegramId, topic);
        const subscribedTopics = this.telegramBotService.getUserSubscriptions(telegramId);

        await ctx.answerCbQuery();

        await ctx.reply(
            message,
            TelegramBotKeyboards.getMainMenuKeyboard(),
        );

        if (subscribedTopics.length > 0) {
            await ctx.reply(
                'Остались активные подписки. Можешь отписаться ещё от одной темы:',
                TelegramBotKeyboards.getUnsubscribeKeyboard(subscribedTopics),
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
        const callbackQuery = ctx.callbackQuery;

        if (!callbackQuery || !('data' in callbackQuery)) {
            return null;
        }

        return callbackQuery.data;
    }
}