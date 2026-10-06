import { Test, TestingModule } from '@nestjs/testing';
import { GeminiClient } from '../../src/ai/gemini/gemini.client';
import { ResearchGraph } from '../../src/research/graphs/research.graph';
import { ResearchRetrievalService } from '../../src/research/research-retrieval.service';
import { ContextService } from '../../src/research/context.service';
import { ResearchAnswerService } from '../../src/research/research-answer.service';
import { RESEARCH_ANSWER_SYSTEM_PROMPT } from '../../src/research/prompts/research-answer.prompt';

jest.mock('../../src/ai/gemini/gemini.client', (): object => ({ GeminiClient: jest.fn() }));
jest.mock('../../src/research/research-retrieval.service', (): object => ({ ResearchRetrievalService: jest.fn() }));

describe('ResearchGraph with real context and answer services', (): void => {
    let module: TestingModule;
    let graph: ResearchGraph;
    const search: jest.Mock = jest.fn();
    const generateText: jest.Mock = jest.fn();

    beforeEach(async (): Promise<void> => {
        jest.resetAllMocks();
        search.mockResolvedValue([{ pointId: 'one', articleId: 42, summaryHash: 'a'.repeat(64), index: 0, text: 'Факт', startOffset: 0, endOffset: 4, score: 0.9 }]);
        generateText.mockResolvedValue(JSON.stringify({ answer: 'Ответ [42]', sourceArticleIds: [42] }));
        module = await Test.createTestingModule({ providers: [ResearchGraph, ContextService, ResearchAnswerService,
            { provide: ResearchRetrievalService, useValue: { search } },
            { provide: GeminiClient, useValue: { generateText } },
        ] }).compile();
        graph = module.get(ResearchGraph);
    });

    afterEach(async (): Promise<void> => { await module.close(); });

    it('retrieves, builds context and validates the generated answer', async (): Promise<void> => {
        expect(await graph.research(' Вопрос ')).toEqual({ answer: 'Ответ [42]', sourceArticleIds: [42] });
        expect(search).toHaveBeenCalledWith('Вопрос');
        expect(generateText).toHaveBeenCalledWith(RESEARCH_ANSWER_SYSTEM_PROMPT, JSON.stringify({ question: 'Вопрос', fragments: [{ articleId: 42, text: 'Факт' }] }));
        expect(search).toHaveBeenCalledTimes(1);
        expect(generateText).toHaveBeenCalledTimes(1);
    });

    it('does not call Gemini for an empty archive or reuse previous context', async (): Promise<void> => {
        await graph.research('Первый вопрос');
        search.mockResolvedValue([]);
        expect(await graph.research('Другой вопрос')).toEqual({ answer: 'В проиндексированном архиве недостаточно данных для ответа.', sourceArticleIds: [] });
        expect(generateText).toHaveBeenCalledTimes(1);
    });

    it.each(['   ', 'я'.repeat(2001)])('rejects an invalid question before retrieval %#', async (question: string): Promise<void> => {
        await expect(graph.research(question)).rejects.toThrow();
        expect(search).not.toHaveBeenCalled();
        expect(generateText).not.toHaveBeenCalled();
    });

    it('stops on retrieval failure', async (): Promise<void> => {
        search.mockRejectedValue(new Error('Qdrant unavailable'));
        await expect(graph.research('Вопрос')).rejects.toThrow('Qdrant unavailable');
        expect(generateText).not.toHaveBeenCalled();
        expect(search).toHaveBeenCalledTimes(1);
    });

    it('propagates API failure without a paid retry', async (): Promise<void> => {
        generateText.mockRejectedValue(new Error('API unavailable'));
        await expect(graph.research('Вопрос')).rejects.toThrow('API unavailable');
        expect(generateText).toHaveBeenCalledTimes(1);
    });

    it('rejects a model citation outside the retrieved archive', async (): Promise<void> => {
        generateText.mockResolvedValue(JSON.stringify({ answer: 'Ответ [999]', sourceArticleIds: [999] }));
        await expect(graph.research('Вопрос')).rejects.toThrow('вне переданного контекста');
        expect(generateText).toHaveBeenCalledTimes(1);
    });
});
