import { Test, TestingModule } from '@nestjs/testing';
import { getBotToken } from 'nestjs-telegraf';
import { TelegramBotService } from '../../src/telegram-bot/telegram-bot.service';
import { NewsArticlesService } from '../../src/news_article/news-articles.service';
import { NewsTopicsService } from '../../src/news-topic/news-topics.service';
import { NewsSubscriptionService } from '../../src/news-subscription/news-subscription.service';
import { SimilarNewsGraph } from '../../src/news-search/graphs/similar-news.graph';
import { NewsSearchService } from '../../src/news-search/news-search.service';
import { NewsArticlesFormatter } from '../../src/telegram-messaging/formatters/news-articles.formatter';
import type { NewsArticleSummaryDto } from '../../src/news_article/dto/news-article-summary.dto';
import type { TelegramMessageDto } from '../../src/telegram-messaging/dto/telegram-message.dto';

// These service tests isolate database, graph and external API dependencies.
jest.mock('../../src/news_article/news-articles.service', () => ({ NewsArticlesService: class {} }));
jest.mock('../../src/news-topic/news-topics.service', () => ({ NewsTopicsService: class {} }));
jest.mock('../../src/news-subscription/news-subscription.service', () => ({ NewsSubscriptionService: class {} }));
jest.mock('../../src/news-search/graphs/similar-news.graph', () => ({ SimilarNewsGraph: class {} }));

describe('Telegram article search messages', (): void => {
    let module: TestingModule;
    let service: TelegramBotService;
    const search: jest.Mock = jest.fn();
    const getArticle: jest.Mock = jest.fn();

    function article(id: number, title: string = `Статья ${id}`): NewsArticleSummaryDto {
        return { id, title, summary: 'Готовый пересказ.', url: `https://dev.to/test/${id}`, topics: [] };
    }

    beforeEach(async (): Promise<void> => {
        jest.resetAllMocks();
        module = await Test.createTestingModule({
            providers: [
                TelegramBotService,
                NewsArticlesFormatter,
                { provide: getBotToken(), useValue: {} },
                { provide: NewsArticlesService, useValue: {} },
                { provide: NewsTopicsService, useValue: {} },
                { provide: NewsSubscriptionService, useValue: {} },
                { provide: SimilarNewsGraph, useValue: { search } },
                { provide: NewsSearchService, useValue: { getArticle } },
            ],
        }).compile();
        service = module.get(TelegramBotService);
    });

    afterEach(async (): Promise<void> => {
        await module.close();
    });

    it('returns one message with at most three ordered title callbacks, without summaries', async (): Promise<void> => {
        search.mockResolvedValue({ indexed: true, articles: [article(8, '  Первая\n статья  '), article(3), article(5), article(9)] });
        const messages: TelegramMessageDto[] = await service.getSimilarNewsMessages(1);
        expect(search).toHaveBeenCalledWith(1);
        expect(messages).toEqual([{
            text: 'Похожие статьи:',
            buttons: [
                { text: 'Первая статья', callbackData: 'article:8' },
                { text: 'Статья 3', callbackData: 'article:3' },
                { text: 'Статья 5', callbackData: 'article:5' },
            ],
        }]);
    });

    it('uses an article identifier when the title is blank', async (): Promise<void> => {
        search.mockResolvedValue({ indexed: true, articles: [article(8, ' \n ')] });
        expect((await service.getSimilarNewsMessages(1))[0].buttons).toEqual([
            { text: 'Статья №8', callbackData: 'article:8' },
        ]);
    });

    it('distinguishes an unindexed source from an empty search', async (): Promise<void> => {
        search.mockResolvedValueOnce({ indexed: false, articles: [] });
        expect(await service.getSimilarNewsMessages(1)).toEqual([{
            text: 'Эта новость ещё не готова для поиска похожих. Попробуй позже.', buttons: [],
        }]);
        search.mockResolvedValueOnce({ indexed: true, articles: [] });
        expect(await service.getSimilarNewsMessages(1)).toEqual([{
            text: 'В архиве пока нет похожих новостей.', buttons: [],
        }]);
    });

    it('opens the selected summary with both buttons without searching again', async (): Promise<void> => {
        getArticle.mockResolvedValue(article(8));
        expect(await service.getArticleMessage(8)).toEqual({
            text: 'Статья 8\n\nГотовый пересказ.',
            buttons: [
                { text: 'Оригинал статьи', url: 'https://dev.to/test/8' },
                { text: 'Найти похожие новости', callbackData: 'similar:8' },
            ],
        });
        expect(getArticle).toHaveBeenCalledWith(8);
        expect(search).not.toHaveBeenCalled();
    });

    it('handles an article removed after the list was sent', async (): Promise<void> => {
        getArticle.mockResolvedValue(null);
        expect(await service.getArticleMessage(8)).toEqual({
            text: 'Эта статья больше недоступна или её пересказ ещё не готов.', buttons: [],
        });
    });

    it('does not disguise infrastructure failures as empty results', async (): Promise<void> => {
        search.mockRejectedValue(new Error('Qdrant unavailable'));
        await expect(service.getSimilarNewsMessages(1)).rejects.toThrow('Qdrant unavailable');
        getArticle.mockRejectedValue(new Error('Database unavailable'));
        await expect(service.getArticleMessage(8)).rejects.toThrow('Database unavailable');
    });
});
