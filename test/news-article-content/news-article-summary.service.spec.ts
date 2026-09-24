import { ConfigService } from '@nestjs/config';

import { GeminiClient } from '../../src/ai/gemini/gemini.client';
import { NewsArticleSummaryService } from '../../src/news-article-content/news-article-summary.service';
import { NEWS_SUMMARY_SYSTEM_PROMPT } from '../../src/news-article-content/prompts/news-summary.prompt';

jest.mock('../../src/ai/gemini/gemini.client', (): {
    GeminiClient: jest.Mock;
} => ({
    GeminiClient: jest.fn().mockImplementation(
        (): {
            generateText: jest.Mock<Promise<string>, [string, string]>;
        } => ({
            generateText: jest.fn<
                Promise<string>,
                [string, string]
            >(),
        }),
    ),
}));

describe('NewsArticleSummaryService', (): void => {
    let service: NewsArticleSummaryService;

    let generateSpy: jest.SpiedFunction<
        GeminiClient['generateText']
    >;

    beforeEach((): void => {
        const config: ConfigService = new ConfigService();
        const client: GeminiClient = new GeminiClient(config);

        generateSpy = jest
            .spyOn(client, 'generateText')
            .mockResolvedValue('Краткий пересказ.');

        service = new NewsArticleSummaryService(client);
    });

    afterEach((): void => {
        jest.restoreAllMocks();
    });

    it('passes the instruction and full article text to Gemini', async (): Promise<void> => {
        const fullText: string =
            'Первый абзац статьи.\n\nВторой абзац с подробностями.';

        const result: string = await service.summarize(
            `  ${fullText}\n`,
        );

        expect(generateSpy).toHaveBeenCalledTimes(1);
        expect(generateSpy).toHaveBeenCalledWith(
            NEWS_SUMMARY_SYSTEM_PROMPT,
            fullText,
        );
        expect(result).toBe('Краткий пересказ.');
    });

    it('trims whitespace around the summary', async (): Promise<void> => {
        generateSpy.mockResolvedValue(
            ' \nГлавная мысль.\n\n• Существенный факт.\n ',
        );

        const result: string =
            await service.summarize('Полный текст статьи.');

        expect(result).toBe(
            'Главная мысль.\n\n• Существенный факт.',
        );
    });

    it.each(['', '   ', '\n\t'])(
        'rejects empty article text: %j',
        async (fullText: string): Promise<void> => {
            await expect(
                service.summarize(fullText),
            ).rejects.toThrow(
                'Нельзя создать пересказ статьи с пустым текстом.',
            );

            expect(generateSpy).not.toHaveBeenCalled();
        },
    );

    it.each(['', '   ', '\n\t'])(
        'rejects an empty model response: %j',
        async (response: string): Promise<void> => {
            generateSpy.mockResolvedValue(response);

            await expect(
                service.summarize('Полный текст статьи.'),
            ).rejects.toThrow('Gemini вернул пустой пересказ.');
        },
    );

    it('accepts a summary of exactly 2000 characters', async (): Promise<void> => {
        const summary: string = 'а'.repeat(2000);

        generateSpy.mockResolvedValue(summary);

        await expect(
            service.summarize('Полный текст статьи.'),
        ).resolves.toBe(summary);
    });

    it('rejects a summary exceeding 2000 characters', async (): Promise<void> => {
        generateSpy.mockResolvedValue('а'.repeat(2001));

        await expect(
            service.summarize('Полный текст статьи.'),
        ).rejects.toThrow(
            'Пересказ превышает лимит 2000 символов.',
        );
    });

    it('checks length after trimming outer whitespace', async (): Promise<void> => {
        const summary: string = 'а'.repeat(2000);

        generateSpy.mockResolvedValue(` \n${summary}\n `);

        await expect(
            service.summarize('Полный текст статьи.'),
        ).resolves.toBe(summary);
    });

    it('propagates Gemini errors to the job handler', async (): Promise<void> => {
        const error: Error = new Error('Gemini timeout');

        generateSpy.mockRejectedValue(error);

        await expect(
            service.summarize('Полный текст статьи.'),
        ).rejects.toBe(error);

        expect(generateSpy).toHaveBeenCalledTimes(1);
    });
});