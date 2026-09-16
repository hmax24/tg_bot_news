import { BOT_BUTTONS, CALLBACK_PREFIXES } from './telegram-bot.constants';

export class TelegramBotKeyboards {
    static getMainMenuKeyboard() {
        return {
            reply_markup: {
                keyboard: [
                    [
                        { text: BOT_BUTTONS.TOPICS },
                        { text: BOT_BUTTONS.MY_SUBSCRIPTIONS },
                    ],
                    [
                        { text: BOT_BUTTONS.UNSUBSCRIBE },
                        { text: BOT_BUTTONS.HELP },
                    ],
                ],
                resize_keyboard: true,
                one_time_keyboard: false,
            },
        };
    }

    static getTopicsKeyboard(topics: string[], subscribedTopics: string[] = []) {
        const buttons = topics.map((topic) => {
            const isSubscribed = subscribedTopics.includes(topic);

            return [
                {
                    text: isSubscribed ? `✅ ${topic}` : topic,
                    callback_data: `${CALLBACK_PREFIXES.SUBSCRIBE_TOPIC}${topic}`,
                },
            ];
        });

        return {
            reply_markup: {
                inline_keyboard: buttons,
            },
        };
    }

    static getUnsubscribeKeyboard(subscribedTopics: string[]) {
        const buttons = subscribedTopics.map((topic) => [
            {
                text: `❌ ${topic}`,
                callback_data: `${CALLBACK_PREFIXES.UNSUBSCRIBE_TOPIC}${topic}`,
            },
        ]);

        return {
            reply_markup: {
                inline_keyboard: buttons,
            },
        };
    }
}