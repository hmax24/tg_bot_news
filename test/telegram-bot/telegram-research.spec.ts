import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Context } from 'telegraf';
import { TelegramResearchService } from '../../src/telegram-bot/telegram-research.service';
import { TelegramBotUpdate } from '../../src/telegram-bot/telegram-bot.update';
import { TelegramBotService } from '../../src/telegram-bot/telegram-bot.service';
import { ResearchGraph } from '../../src/research/graphs/research.graph';
import { NewsSearchService } from '../../src/news-search/news-search.service';
import type { TelegramMessageDto } from '../../src/telegram-messaging/dto/telegram-message.dto';
import { TelegramBotKeyboards } from '../../src/telegram-bot/telegram-bot.keyboards';

jest.mock('../../src/research/graphs/research.graph', (): object => ({ ResearchGraph: jest.fn() }));
jest.mock('../../src/telegram-bot/telegram-bot.service', (): object => ({ TelegramBotService: jest.fn() }));
jest.mock('../../src/news-search/news-search.service', (): object => ({ NewsSearchService: jest.fn() }));

describe('TelegramResearchService', (): void => {
    let module: TestingModule;
    let service: TelegramResearchService;
    const research: jest.Mock = jest.fn();
    const getArticle: jest.Mock = jest.fn();

    beforeEach(async (): Promise<void> => {
        jest.resetAllMocks();
        module = await Test.createTestingModule({ providers: [TelegramResearchService,
            { provide: ResearchGraph, useValue: { research } },
            { provide: NewsSearchService, useValue: { getArticle } },
        ] }).compile();
        service = module.get(TelegramResearchService);
    });
    afterEach(async (): Promise<void> => { await module.close(); });

    it('preserves citation order and creates article callbacks with normalized titles', async (): Promise<void> => {
        research.mockResolvedValue({ answer: 'Ответ [8][3]', sourceArticleIds: [8, 3] });
        getArticle.mockResolvedValueOnce({ title: '  Первая\n статья ' }).mockResolvedValueOnce({ title: 'Вторая' });
        expect(await service.research('Вопрос')).toEqual({ text: 'Ответ [8][3]', buttons: [
            { text: 'Первая статья', callbackData: 'article:8' },
            { text: 'Вторая', callbackData: 'article:3' },
        ] });
        expect(research).toHaveBeenCalledWith('Вопрос');
        expect(getArticle.mock.calls).toEqual([[8], [3]]);
    });

    it('returns an answer without buttons when there are no sources', async (): Promise<void> => {
        research.mockResolvedValue({ answer: 'Недостаточно данных', sourceArticleIds: [] });
        expect(await service.research('Вопрос')).toEqual({ text: 'Недостаточно данных', buttons: [] });
        expect(getArticle).not.toHaveBeenCalled();
    });

    it('keeps a source reference when its article has disappeared', async (): Promise<void> => {
        research.mockResolvedValue({ answer: 'Ответ [8]', sourceArticleIds: [8] });
        getArticle.mockResolvedValue(null);
        expect((await service.research('Вопрос')).buttons).toEqual([{ text: 'Статья недоступна', callbackData: 'article:8' }]);
    });

    it('propagates graph errors without loading articles', async (): Promise<void> => {
        research.mockRejectedValue(new Error('Failed'));
        await expect(service.research('Вопрос')).rejects.toThrow('Failed');
        expect(getArticle).not.toHaveBeenCalled();
    });
});

describe('Telegram research command', (): void => {
    let module: TestingModule;
    let update: TelegramBotUpdate;
    const research: jest.Mock = jest.fn();
    const reply: jest.Mock = jest.fn();

    function context(text: string): Context {
        return { message: { text }, reply } as unknown as Context;
    }

    beforeEach(async (): Promise<void> => {
        jest.resetAllMocks();
        jest.spyOn(Logger.prototype, 'error').mockImplementation((): void => {});
        reply.mockResolvedValue({});
        research.mockResolvedValue({ text: 'Ответ [8]', buttons: [{ text: 'Статья', callbackData: 'article:8' }] });
        module = await Test.createTestingModule({ providers: [TelegramBotUpdate,
            { provide: TelegramBotService, useValue: {} },
            { provide: TelegramResearchService, useValue: { research } },
        ] }).compile();
        update = module.get(TelegramBotUpdate);
    });
    afterEach(async (): Promise<void> => { await module.close(); jest.restoreAllMocks(); });

    it('parses addressed commands and sends the answer with source buttons', async (): Promise<void> => {
        await update.research(context('/research@news_bot  Вопрос\nо Sentinel '));
        expect(research).toHaveBeenCalledWith('Вопрос\nо Sentinel');
        expect(reply).toHaveBeenNthCalledWith(1, 'Ищу информацию в архиве…', TelegramBotKeyboards.getMainMenuKeyboard());
        expect(reply).toHaveBeenLastCalledWith('Ответ [8]', { reply_markup: { inline_keyboard: [[{ text: 'Статья', callback_data: 'article:8' }]] } });
    });

    it.each(['/research', '/research ' + 'я'.repeat(2001)])('rejects invalid input without API work %#', async (text: string): Promise<void> => {
        await update.research(context(text));
        expect(research).not.toHaveBeenCalled();
        expect(reply).toHaveBeenCalledTimes(1);
    });

    it('blocks concurrent work and releases the lock after completion', async (): Promise<void> => {
        let finish!: (message: TelegramMessageDto) => void;
        const pending: Promise<TelegramMessageDto> = new Promise((resolve): void => { finish = resolve; });
        research.mockReturnValueOnce(pending);
        const first: Promise<void> = update.research(context('/research Первый'));
        await Promise.resolve();
        await update.research(context('/research Второй'));
        expect(research).toHaveBeenCalledTimes(1);
        expect(reply).toHaveBeenCalledWith('Сейчас обрабатывается другой вопрос. Попробуй чуть позже.', TelegramBotKeyboards.getMainMenuKeyboard());
        finish({ text: 'Ответ', buttons: [] });
        await first;
        await update.research(context('/research Третий'));
        expect(research).toHaveBeenCalledTimes(2);
    });

    it('releases the lock after a graph failure and sends a safe error', async (): Promise<void> => {
        research.mockRejectedValueOnce(new Error('sensitive provider details'));
        await update.research(context('/research Первый'));
        expect(reply).toHaveBeenLastCalledWith('Не удалось выполнить исследование. Попробуй позже.');
        await update.research(context('/research Второй'));
        expect(research).toHaveBeenCalledTimes(2);
    });

    it('releases the lock if the initial Telegram reply fails', async (): Promise<void> => {
        reply.mockRejectedValueOnce(new Error('Telegram unavailable'));
        await expect(update.research(context('/research Первый'))).rejects.toThrow('Telegram unavailable');
        expect(research).not.toHaveBeenCalled();
        await update.research(context('/research Второй'));
        expect(research).toHaveBeenCalledTimes(1);
    });
});
