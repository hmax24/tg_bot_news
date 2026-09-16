import {BOT_BUTTONS, CALLBACK_PREFIXES} from './telegram-bot.constants';
import type {
    InlineKeyboardMarkup,
    InlineKeyboardButton,
} from 'telegraf/types';
import type { NewsTopicDto } from '../news-topic/dto/news-topic.dto';

export class TelegramBotKeyboards {
    static getMainMenuKeyboard() {
        return {
            reply_markup: {
                keyboard: [
                    [
                        {text: BOT_BUTTONS.TOPICS},
                        {text: BOT_BUTTONS.MY_SUBSCRIPTIONS},
                    ],
                    [
                        {text: BOT_BUTTONS.UNSUBSCRIBE},
                        {text: BOT_BUTTONS.HELP},
                    ],
                ],
                resize_keyboard: true,
                one_time_keyboard: false,
            },
        };
    }

    static getTopicsKeyboard(
        topics: NewsTopicDto[],
        subscribedTopicIds: number[] = [],
    ): { reply_markup: InlineKeyboardMarkup } {
        const buttons: InlineKeyboardButton[][] = topics.map(
            (topic: NewsTopicDto): InlineKeyboardButton[] => {
                const isSubscribed: boolean =
                    subscribedTopicIds.includes(topic.id);

                return [
                    {
                        text: isSubscribed
                            ? `✅ ${topic.name}`
                            : topic.name,
                        callback_data:
                            `${CALLBACK_PREFIXES.SUBSCRIBE_TOPIC}${topic.id}`,
                    },
                ];
            },
        );

        return {
            reply_markup: {
                inline_keyboard: buttons,
            },
        };
    }

    static getUnsubscribeKeyboard(
        topics: NewsTopicDto[],
    ): { reply_markup: InlineKeyboardMarkup } {
        const buttons: InlineKeyboardButton[][] = topics.map(
            (topic: NewsTopicDto): InlineKeyboardButton[] => [
                {
                    text: `❌ ${topic.name}`,
                    callback_data:
                        `${CALLBACK_PREFIXES.UNSUBSCRIBE_TOPIC}${topic.id}`,
                },
            ],
        );

        return {
            reply_markup: {
                inline_keyboard: buttons,
            },
        };
    }


}