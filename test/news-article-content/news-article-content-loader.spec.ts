import { DataSource } from 'typeorm';

import { NewsArticle } from '../../src/news_article/news-article.entity';
import { DevToClient } from '../../src/news_article/sources/dev-to/dev-to-client';
import { NewsArticleContent } from '../../src/news-article-content/news-article-content.entity';
import { NewsArticleContentStatus } from '../../src/news-article-content/enums/news-article-content-status.enum';
import { NewsArticleContentRepository } from '../../src/news-article-content/news-article-content.repository';
import { NewsArticleContentLoader } from '../../src/news-article-content/news-article-content-loader.service';

describe('NewsArticleContentLoader', (): void => {
  let source: DataSource;
  let loader: NewsArticleContentLoader;
  let content: NewsArticleContent;
  let findSpy: jest.SpiedFunction<NewsArticleContentRepository['findByArticleId']>;
  let saveSpy: jest.SpiedFunction<NewsArticleContentRepository['saveFullTextIfMissing']>;
  let getArticleSpy: jest.SpiedFunction<DevToClient['getArticleById']>;

  beforeEach((): void => {
    // No initialize(): database and HTTP operations are mocked.
    source = new DataSource({ type: 'postgres' });
    const repository: NewsArticleContentRepository = new NewsArticleContentRepository();
    const client: DevToClient = new DevToClient();
    const article: NewsArticle = new NewsArticle();
    article.id = 10;
    article.sourceName = 'dev.to';
    article.sourceArticleId = 12345;

    content = new NewsArticleContent();
    content.id = 50;
    content.articleId = article.id;
    content.article = article;
    content.fullText = null;
    content.summary = null;
    content.status = NewsArticleContentStatus.PENDING;

    findSpy = jest.spyOn(repository, 'findByArticleId').mockResolvedValue(content);
    saveSpy = jest.spyOn(repository, 'saveFullTextIfMissing').mockResolvedValue(undefined);
    getArticleSpy = jest.spyOn(client, 'getArticleById').mockResolvedValue({
      id: 12345,
      title: 'Test article',
      url: 'https://dev.to/test/article',
      body_markdown: '  Полный текст статьи.\n',
    });
    loader = new NewsArticleContentLoader(source, repository, client);
  });

  afterEach((): void => {
    jest.restoreAllMocks();
  });

  it('loads by source ID and saves trimmed text', async (): Promise<void> => {
    await loader.loadForArticle(10);
    expect(findSpy).toHaveBeenCalledWith(10, source.manager);
    expect(getArticleSpy).toHaveBeenCalledTimes(1);
    expect(getArticleSpy).toHaveBeenCalledWith(12345);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith(50, 'Полный текст статьи.', source.manager);
  });

  it('skips an already downloaded article', async (): Promise<void> => {
    content.fullText = 'Ранее сохранённый текст.';
    await loader.loadForArticle(10);
    expect(getArticleSpy).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('rejects a missing processing record', async (): Promise<void> => {
    findSpy.mockResolvedValue(null);
    await expect(loader.loadForArticle(10)).rejects.toThrow(
      'Запись обработки статьи 10 не найдена.',
    );
    expect(getArticleSpy).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('rejects an unsupported source', async (): Promise<void> => {
    content.article.sourceName = 'other';
    await expect(loader.loadForArticle(10)).rejects.toThrow(
      'Источник статьи 10 не поддерживается.',
    );
    expect(getArticleSpy).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it.each([null, 0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid source ID: %s',
    async (sourceArticleId: number | null): Promise<void> => {
      content.article.sourceArticleId = sourceArticleId;
      await expect(loader.loadForArticle(10)).rejects.toThrow(
        'У статьи 10 отсутствует корректный ID DEV.to.',
      );
      expect(getArticleSpy).not.toHaveBeenCalled();
      expect(saveSpy).not.toHaveBeenCalled();
    },
  );

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid local article ID: %s',
    async (articleId: number): Promise<void> => {
      await expect(loader.loadForArticle(articleId)).rejects.toThrow(
        'Некорректный ID статьи.',
      );
      expect(findSpy).not.toHaveBeenCalled();
      expect(getArticleSpy).not.toHaveBeenCalled();
      expect(saveSpy).not.toHaveBeenCalled();
    },
  );

  it('propagates API errors without saving text', async (): Promise<void> => {
    const error: Error = new Error('DEV.to timeout');
    getArticleSpy.mockRejectedValue(error);
    await expect(loader.loadForArticle(10)).rejects.toBe(error);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('propagates database write errors', async (): Promise<void> => {
    const error: Error = new Error('Database unavailable');
    saveSpy.mockRejectedValue(error);
    await expect(loader.loadForArticle(10)).rejects.toBe(error);
  });
});
