import { NewsArticlesFormatter } from '../../../src/telegram-messaging/formatters/news-articles.formatter';
import type { NewsArticleSummaryMessageDto } from '../../../src/telegram-messaging/dto/news-article-summary-message.dto';
import type { TelegramMessageDto } from '../../../src/telegram-messaging/dto/telegram-message.dto';

describe('NewsArticlesFormatter.formatSummary', (): void => {
    const formatter: NewsArticlesFormatter =
        new NewsArticlesFormatter();

    function createArticle(
        summary: string = 'Краткий пересказ.',
    ): NewsArticleSummaryMessageDto {
        return {
            title: 'Новая версия библиотеки',
            summary,
            url: 'https://dev.to/test/article',
            topics: [
                { id: 1, name: 'typescript' },
                { id: 2, name: 'backend' },
            ],
        };
    }

    it('includes summary, topics and original article button', (): void => {
        const message: TelegramMessageDto =
            formatter.formatSummary(createArticle());

        expect(message.text).toBe(
            'Новая версия библиотеки\n\n' +
            'Темы: typescript, backend\n\n' +
            'Краткий пересказ.',
        );

        expect(message.buttons).toEqual([
            {
                text: 'Оригинал статьи',
                url: 'https://dev.to/test/article',
            },
        ]);
    });

    it('omits an empty topics section', (): void => {
        const article: NewsArticleSummaryMessageDto = createArticle();
        article.topics = [];

        const message: TelegramMessageDto =
            formatter.formatSummary(article);

        expect(message.text).toBe(
            'Новая версия библиотеки\n\nКраткий пересказ.',
        );
    });

    it.each(['', ' \n '])(
        'rejects an empty summary: %j',
        (summary: string): void => {
            expect((): TelegramMessageDto =>
                formatter.formatSummary(createArticle(summary)),
            ).toThrow(
                'Нельзя сформировать сообщение с пустым пересказом.',
            );
        },
    );

    it('preserves a 2000-character summary with long headers', (): void => {
        const summary: string = 'а'.repeat(2000);
        const article: NewsArticleSummaryMessageDto =
            createArticle(summary);

        article.title = 'З'.repeat(1000);
        article.topics = [
            { id: 1, name: 'т'.repeat(1000) },
        ];

        const message: TelegramMessageDto =
            formatter.formatSummary(article);

        expect(message.text.endsWith(summary)).toBe(true);
        expect(message.text.length).toBeLessThanOrEqual(4000);
    });

    it('rejects an oversized summary instead of truncating it', (): void => {
        expect((): TelegramMessageDto =>
            formatter.formatSummary(
                createArticle('а'.repeat(2001)),
            ),
        ).toThrow('Пересказ превышает лимит 2000 символов.');
    });
});