import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NewsArticleContentCompletionService } from '../../src/news-article-content/news-article-content-completion.service';

import { NewsArticleContent } from '../../src/news-article-content/news-article-content.entity';
import { NewsArticleContentRepository } from '../../src/news-article-content/news-article-content.repository';
import { NewsArticleContentLoader } from '../../src/news-article-content/news-article-content-loader.service';
import { NewsArticleSummaryService } from '../../src/news-article-content/news-article-summary.service';
import { NewsArticleContentProcessor } from '../../src/news-article-content/news-article-content-processor.service';

// Не загружаем GeminiClient и зависимости LangChain.
jest.mock(
    '../../src/news-article-content/news-article-summary.service',
    (): {
        NewsArticleSummaryService: jest.Mock;
    } => ({
        NewsArticleSummaryService: jest.fn(),
    }),
);

describe('NewsArticleContentProcessor', (): void => {
    let module: TestingModule;
    let processor: NewsArticleContentProcessor;
    let source: DataSource;
    let content: NewsArticleContent;
    const next: jest.Mock<Promise<number | null>, [unknown]> = jest.fn();

    const claim: jest.Mock<Promise<boolean>, [number, unknown]> =
        jest.fn();

    const find: jest.Mock<
        Promise<NewsArticleContent | null>,
        [number, unknown]
    > = jest.fn();

    const complete: jest.Mock<
        Promise<void>,
        [number, string]
    > = jest.fn();

    const fail: jest.Mock<Promise<void>, [number, unknown]> =
        jest.fn();

    const load: jest.Mock<Promise<void>, [number]> =
        jest.fn();

    const summarize: jest.Mock<Promise<string>, [string]> =
        jest.fn();

    beforeEach(async (): Promise<void> => {
        jest.resetAllMocks();

        jest.spyOn(Logger.prototype, 'log')
            .mockImplementation((): void => {});

        jest.spyOn(Logger.prototype, 'error')
            .mockImplementation((): void => {});

        // Соединение с БД не открываем.
        source = new DataSource({ type: 'postgres' });

        content = new NewsArticleContent();
        content.articleId = 10;
        content.fullText = 'Полный текст статьи.';

        claim.mockResolvedValue(true);
        next.mockResolvedValue(10);
        find.mockResolvedValue(content);
        complete.mockResolvedValue(undefined);
        fail.mockResolvedValue(undefined);
        load.mockResolvedValue(undefined);
        summarize.mockResolvedValue('Готовый пересказ.');

        module = await Test.createTestingModule({
            providers: [
                NewsArticleContentProcessor,
                {
                    provide: DataSource,
                    useValue: source,
                },
                {
                    provide: NewsArticleContentRepository,
                    useValue: {
                        claimPending: claim,
                        findNextPendingArticleId: next,
                        findByArticleId: find,
                        markFailed: fail,
                    },
                },
                {
                    provide: NewsArticleContentCompletionService,
                    useValue: { complete },
                },
                {
                    provide: NewsArticleContentLoader,
                    useValue: {
                        loadForArticle: load,
                    },
                },
                {
                    provide: NewsArticleSummaryService,
                    useValue: {
                        summarize,
                    },
                },
            ],
        }).compile();

        processor = module.get<NewsArticleContentProcessor>(
            NewsArticleContentProcessor,
        );
    });

    afterEach(async (): Promise<void> => {
        await module?.close();
        jest.restoreAllMocks();
    });

    it('does nothing for an empty queue', async (): Promise<void> => {
        next.mockResolvedValue(null);
        await expect(processor.processNext()).resolves.toBe(false);
        expect(claim).not.toHaveBeenCalled();
        expect(load).not.toHaveBeenCalled();
    });

    it('processes the article selected from the queue', async (): Promise<void> => {
        await expect(processor.processNext()).resolves.toBe(true);
        expect(next).toHaveBeenCalledWith(source.manager);
        expect(claim).toHaveBeenCalledWith(10, source.manager);
        expect(complete).toHaveBeenCalledWith(10, 'Готовый пересказ.');
    });

    it('skips an article claimed by another worker', async (): Promise<void> => {
        claim.mockResolvedValue(false);
        await expect(processor.processNext()).resolves.toBe(false);
        expect(load).not.toHaveBeenCalled();
    });

    it('propagates queue lookup errors', async (): Promise<void> => {
        const error: Error = new Error('Database unavailable');
        next.mockRejectedValue(error);
        await expect(processor.processNext()).rejects.toBe(error);
        expect(claim).not.toHaveBeenCalled();
    });

    it('loads, summarizes and saves the result', async (): Promise<void> => {
        await expect(processor.processArticle(10)).resolves.toBe(true);

        expect(claim).toHaveBeenCalledWith(10, source.manager);
        expect(load).toHaveBeenCalledWith(10);
        expect(find).toHaveBeenCalledWith(10, source.manager);
        expect(summarize).toHaveBeenCalledWith(
            'Полный текст статьи.',
        );
        expect(complete).toHaveBeenCalledWith(
            10,
            'Готовый пересказ.',
        );
        expect(fail).not.toHaveBeenCalled();

        expect(load.mock.invocationCallOrder[0]).toBeLessThan(
            summarize.mock.invocationCallOrder[0],
        );
        expect(summarize.mock.invocationCallOrder[0]).toBeLessThan(
            complete.mock.invocationCallOrder[0],
        );
    });

    it('skips a job that was not claimed', async (): Promise<void> => {
        claim.mockResolvedValue(false);

        await expect(processor.processArticle(10)).resolves.toBe(false);

        expect(load).not.toHaveBeenCalled();
        expect(find).not.toHaveBeenCalled();
        expect(summarize).not.toHaveBeenCalled();
        expect(complete).not.toHaveBeenCalled();
        expect(fail).not.toHaveBeenCalled();
    });

    it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
        'rejects invalid article ID: %s',
        async (articleId: number): Promise<void> => {
            await expect(
                processor.processArticle(articleId),
            ).rejects.toThrow('Некорректный ID статьи.');

            expect(claim).not.toHaveBeenCalled();
            expect(load).not.toHaveBeenCalled();
        },
    );

    it('propagates claim errors without changing job status', async (): Promise<void> => {
        const error: Error = new Error('Database unavailable');
        claim.mockRejectedValue(error);

        await expect(processor.processArticle(10)).rejects.toBe(error);

        expect(load).not.toHaveBeenCalled();
        expect(fail).not.toHaveBeenCalled();
    });

    it('marks the job failed when loading fails', async (): Promise<void> => {
        const error: Error = new Error('DEV.to unavailable');
        load.mockRejectedValue(error);

        await expect(processor.processArticle(10)).rejects.toBe(error);

        expect(summarize).not.toHaveBeenCalled();
        expect(complete).not.toHaveBeenCalled();
        expect(fail).toHaveBeenCalledWith(10, source.manager);
    });

    it('marks the job failed when its record disappears', async (): Promise<void> => {
        find.mockResolvedValue(null);

        await expect(processor.processArticle(10)).rejects.toThrow(
            'Полный текст статьи 10 отсутствует.',
        );

        expect(summarize).not.toHaveBeenCalled();
        expect(fail).toHaveBeenCalledWith(10, source.manager);
    });

    it.each([null, '', ' \n '])(
        'rejects missing or empty full text: %j',
        async (fullText: string | null): Promise<void> => {
            content.fullText = fullText;

            await expect(processor.processArticle(10)).rejects.toThrow(
                'Полный текст статьи 10 отсутствует.',
            );

            expect(summarize).not.toHaveBeenCalled();
            expect(complete).not.toHaveBeenCalled();
            expect(fail).toHaveBeenCalledWith(10, source.manager);
        },
    );

    it('marks the job failed when Gemini fails', async (): Promise<void> => {
        const error: Error = new Error('Gemini timeout');
        summarize.mockRejectedValue(error);

        await expect(processor.processArticle(10)).rejects.toBe(error);

        expect(complete).not.toHaveBeenCalled();
        expect(fail).toHaveBeenCalledWith(10, source.manager);
    });

    it('propagates result persistence errors', async (): Promise<void> => {
        const error: Error = new Error('Cannot save summary');
        complete.mockRejectedValue(error);

        await expect(processor.processArticle(10)).rejects.toBe(error);

        expect(fail).toHaveBeenCalledWith(10, source.manager);
    });

    it('preserves the original error if saving FAILED also fails', async (): Promise<void> => {
        const originalError: Error = new Error('Gemini timeout');
        const databaseError: Error = new Error('Database unavailable');

        summarize.mockRejectedValue(originalError);
        fail.mockRejectedValue(databaseError);

        await expect(
            processor.processArticle(10),
        ).rejects.toBe(originalError);

        expect(fail).toHaveBeenCalledTimes(1);
    });
});
