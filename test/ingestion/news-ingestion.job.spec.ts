import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NewsIngestionJob } from '../../src/ingestion/news-ingestion.job';
import { NewsIngestionQueueService } from '../../src/ingestion/news-ingestion-queue.service';
import { NewsIngestionProcessor } from '../../src/ingestion/news-ingestion.processor';

// Capture the scheduler configuration without starting timers or importing its ESM runtime.
jest.mock('@nestjs/schedule', (): object => ({
    Cron: (expression: string, options: object): MethodDecorator =>
        (_target: object, _key: string | symbol, descriptor: PropertyDescriptor): void => {
            Reflect.defineMetadata('test:cron', { expression, ...options }, descriptor.value);
        },
}));
jest.mock('../../src/ingestion/news-ingestion-queue.service', (): object => ({ NewsIngestionQueueService: jest.fn() }));
jest.mock('../../src/ingestion/news-ingestion.processor', (): object => ({ NewsIngestionProcessor: jest.fn() }));

describe('NewsIngestionJob', (): void => {
    let module: TestingModule | undefined;
    let logError: jest.SpiedFunction<Logger['error']>;
    const prepareNext: jest.Mock<Promise<number | null>, []> = jest.fn();
    const processNext: jest.Mock<Promise<boolean>, []> = jest.fn();
    const required: string[] = ['GOOGLE_API_KEY', 'GEMINI_EMBEDDING_MODEL', 'GEMINI_EMBEDDING_DIMENSIONS', 'QDRANT_URL', 'QDRANT_COLLECTION', 'QDRANT_CHUNKS_COLLECTION'];
    const valid: Record<string, string> = {
        NEWS_INGESTION_ENABLED: 'true', GOOGLE_API_KEY: 'test-only',
        GEMINI_EMBEDDING_MODEL: 'test-model', GEMINI_EMBEDDING_DIMENSIONS: '768',
        QDRANT_URL: 'http://localhost:6333', QDRANT_COLLECTION: 'summaries', QDRANT_CHUNKS_COLLECTION: 'chunks',
    };

    async function createJob(settings: Record<string, string> = valid): Promise<NewsIngestionJob> {
        module = await Test.createTestingModule({ providers: [NewsIngestionJob,
            { provide: ConfigService, useValue: new ConfigService(settings) },
            { provide: NewsIngestionQueueService, useValue: { prepareNext } },
            { provide: NewsIngestionProcessor, useValue: { processNext } },
        ] }).compile();
        return module.get(NewsIngestionJob);
    }

    beforeEach((): void => {
        module = undefined;
        prepareNext.mockReset().mockResolvedValue(42);
        processNext.mockReset().mockResolvedValue(true);
        const environment: NodeJS.ProcessEnv = { ...process.env };
        for (const key of [...required, 'NEWS_INGESTION_ENABLED']) delete environment[key];
        jest.replaceProperty(process, 'env', environment);
        logError = jest.spyOn(Logger.prototype, 'error').mockImplementation((): void => {});
    });

    afterEach(async (): Promise<void> => {
        await module?.close();
        jest.restoreAllMocks();
    });

    it.each([{}, { NEWS_INGESTION_ENABLED: 'false' }])('does no work when disabled %#', async (settings: Record<string, string>): Promise<void> => {
        const job: NewsIngestionJob = await createJob(settings);
        await job.run();
        expect(prepareNext).not.toHaveBeenCalled();
        expect(processNext).not.toHaveBeenCalled();
    });

    it.each(['TRUE', '1', '', ' true '])('rejects an invalid flag %j', async (value: string): Promise<void> => {
        await expect(createJob({ ...valid, NEWS_INGESTION_ENABLED: value })).rejects.toThrow('NEWS_INGESTION_ENABLED');
    });

    it.each(required)('requires %s when enabled', async (key: string): Promise<void> => {
        const settings: Record<string, string> = { ...valid };
        delete settings[key];
        await expect(createJob(settings)).rejects.toThrow(key);
        expect(prepareNext).not.toHaveBeenCalled();
    });

    it.each(required)('rejects whitespace in %s', async (key: string): Promise<void> => {
        await expect(createJob({ ...valid, [key]: '   ' })).rejects.toThrow(key);
    });

    it('waits for preparation before processing one job', async (): Promise<void> => {
        let finish!: (value: number | null) => void;
        prepareNext.mockReturnValueOnce(new Promise<number | null>((resolve): void => { finish = resolve; }));
        const job: NewsIngestionJob = await createJob();
        const running: Promise<void> = job.run();
        expect(processNext).not.toHaveBeenCalled();
        finish(42);
        await running;
        expect(prepareNext).toHaveBeenCalledTimes(1);
        expect(processNext).toHaveBeenCalledTimes(1);
    });

    it('processes existing pending work even without a newly prepared article', async (): Promise<void> => {
        prepareNext.mockResolvedValue(null);
        const job: NewsIngestionJob = await createJob();
        await job.run();
        expect(processNext).toHaveBeenCalledTimes(1);
        expect(logError).not.toHaveBeenCalled();
    });

    it('accepts an empty queue without an error', async (): Promise<void> => {
        prepareNext.mockResolvedValue(null);
        processNext.mockResolvedValue(false);
        await (await createJob()).run();
        expect(logError).not.toHaveBeenCalled();
    });

    it('stops processing on preparation failure and allows a later run', async (): Promise<void> => {
        prepareNext.mockRejectedValueOnce(new Error('sensitive database details'));
        const job: NewsIngestionJob = await createJob();
        await expect(job.run()).resolves.toBeUndefined();
        expect(processNext).not.toHaveBeenCalled();
        expect(logError).toHaveBeenCalledTimes(1);
        expect(logError).toHaveBeenCalledWith('News ingestion job failed. Check ingestion status.');
        await job.run();
        expect(processNext).toHaveBeenCalledTimes(1);
    });

    it('contains processor failures without logging secrets or immediately retrying', async (): Promise<void> => {
        processNext.mockRejectedValueOnce(new Error('secret API key'));
        const job: NewsIngestionJob = await createJob();
        await expect(job.run()).resolves.toBeUndefined();
        expect(processNext).toHaveBeenCalledTimes(1);
        expect(logError).toHaveBeenCalledTimes(1);
        expect(logError).toHaveBeenCalledWith('News ingestion job failed. Check ingestion status.');
        await job.run();
        expect(processNext).toHaveBeenCalledTimes(2);
    });

    it('configures minute scheduling and scheduler-managed overlap protection', (): void => {
        expect(Reflect.getMetadata('test:cron', NewsIngestionJob.prototype.run)).toEqual({
            expression: '15 * * * * *', name: 'news-ingestion', waitForCompletion: true,
        });
    });
});
