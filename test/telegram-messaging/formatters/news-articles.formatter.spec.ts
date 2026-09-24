import { NewsArticlesFormatter } from '../../../src/telegram-messaging/formatters/news-articles.formatter';
import type { NewsArticleDto } from '../../../src/news_article/dto/news-article.dto';
import type { TelegramMessageDto } from '../../../src/telegram-messaging/dto/telegram-message.dto';

describe('NewsArticlesFormatter', (): void => {
  const formatter: NewsArticlesFormatter = new NewsArticlesFormatter();

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

  it('выводит текст статьи и отдельную кнопку оригинала', (): void => {
    const article: NewsArticleDto = createArticle();

    const result: TelegramMessageDto = formatter.format(article);

    expect(result.text).toBe(
      'Тестовая статья\n\n' +
        'Темы: programming, python\n\n' +
        'Описание статьи',
    );

    expect(result.buttons).toEqual([
      {
        text: 'Оригинал статьи',
        url: article.url,
      },
    ]);

    expect(result.text).not.toContain(article.url);
  });

  it('не выводит строку тем для пустого списка', (): void => {
    const article: NewsArticleDto = createArticle({
      topics: [],
    });

    const result: TelegramMessageDto = formatter.format(article);

    expect(result.text).toBe('Тестовая статья\n\nОписание статьи');
  });

  it('сохраняет темы и кнопку при пустом описании', (): void => {
    const article: NewsArticleDto = createArticle({
      description: '',
    });

    const result: TelegramMessageDto = formatter.format(article);

    expect(result.text).toBe('Тестовая статья\n\nТемы: programming, python');
    expect(result.buttons[0]?.url).toBe(article.url);
  });

  it('ограничивает длину текста сообщения', (): void => {
    const article: NewsArticleDto = createArticle({
      title: 'З'.repeat(1000),
      description: 'Д'.repeat(10000),
      topics: [{ id: 1, name: 'т'.repeat(2000) }],
    });

    const result: TelegramMessageDto = formatter.format(article);

    expect(result.text.length).toBeLessThanOrEqual(4000);
    expect(result.buttons[0]?.url).toBe(article.url);
  });

  it('формирует отдельную ссылку для каждой статьи', (): void => {
    const first: TelegramMessageDto = formatter.format(createArticle());

    const second: TelegramMessageDto = formatter.format(
      createArticle({
        id: 2,
        url: 'https://dev.to/example/second',
      }),
    );

    expect(first.buttons[0]?.url).toBe('https://dev.to/example/article');
    expect(second.buttons[0]?.url).toBe('https://dev.to/example/second');
  });
});
