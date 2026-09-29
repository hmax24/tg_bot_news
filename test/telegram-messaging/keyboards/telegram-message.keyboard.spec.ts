import { TelegramMessageKeyboard } from '../../../src/telegram-messaging/keyboards/telegram-message.keyboard';

describe('TelegramMessageKeyboard', (): void => {
    it('preserves URL and callback actions in separate rows', (): void => {
        expect(TelegramMessageKeyboard.create([
            { text: 'Оригинал статьи', url: 'https://dev.to/test/article' },
            { text: 'Найти похожие новости', callbackData: 'similar:2512' },
            { text: 'Название статьи', callbackData: 'article:2526' },
        ])).toEqual({
            inline_keyboard: [
                [{ text: 'Оригинал статьи', url: 'https://dev.to/test/article' }],
                [{ text: 'Найти похожие новости', callback_data: 'similar:2512' }],
                [{ text: 'Название статьи', callback_data: 'article:2526' }],
            ],
        });
    });

    it('supports informational messages without buttons', (): void => {
        expect(TelegramMessageKeyboard.create([])).toEqual({ inline_keyboard: [] });
    });
});
