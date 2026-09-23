import { NewsArticlesFormatter } from '../../../src/telegram-messaging/formatters/news-articles.formatter';
import type { NewsArticleDto } from '../../../src/news_article/dto/news-article.dto';

describe('NewsArticlesFormatter', (): void => {
    const formatter: NewsArticlesFormatter =
        new NewsArticlesFormatter();

    const createArticle = (
        overrides: Partial<NewsArticleDto> = {},
    ): NewsArticleDto => ({
        id: 1,
        title: 'Тестовая статья',
        description: 'Описание статьи',
        url: 'https://dev.to/example/article',
        topics: [
            { id: 1, name: 'programming' },
            { id: 2, name: 'python' },
        ],
        ...overrides,
    });

    it('выводит название, несколько тем, описание и ссылку', (): void => {
        const article: NewsArticleDto = createArticle();

        const result: string = formatter.format(article);

        expect(result).toBe(
            'Тестовая статья\n\n' +
            'Темы: programming, python\n\n' +
            'Описание статьи\n\n' +
            'Оригинал: https://dev.to/example/article',
        );
    });

    it('не выводит строку тем, если список пуст', (): void => {
        const article: NewsArticleDto = createArticle({
            topics: [],
        });

        const result: string = formatter.format(article);

        expect(result).toBe(
            'Тестовая статья\n\n' +
            'Описание статьи\n\n' +
            'Оригинал: https://dev.to/example/article',
        );
    });

    it('сохраняет темы при пустом описании', (): void => {
        const article: NewsArticleDto = createArticle({
            description: '',
        });

        const result: string = formatter.format(article);

        expect(result).toBe(
            'Тестовая статья\n\n' +
            'Темы: programming, python\n\n' +
            'Оригинал: https://dev.to/example/article',
        );
    });

    it('ограничивает длину сообщения и сохраняет ссылку', (): void => {
        const article: NewsArticleDto = createArticle({
            title: 'З'.repeat(1000),
            description: 'Д'.repeat(10000),
            topics: [
                { id: 1, name: 'т'.repeat(2000) },
            ],
        });

        const result: string = formatter.format(article);

        expect(result.length).toBeLessThanOrEqual(4000);
        expect(result).toContain('Темы: ');
        expect(result.endsWith(`Оригинал: ${article.url}`)).toBe(true);
    });

    it('отклоняет сообщение, если ссылка не помещается', (): void => {
        const article: NewsArticleDto = createArticle({
            url: `https://dev.to/${'a'.repeat(4000)}`,
        });

        expect((): string => formatter.format(article)).toThrow(
            'title and URL exceed message limit',
        );
    });
});