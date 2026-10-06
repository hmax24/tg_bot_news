import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { NewsIngestionProcessor } from '../../src/ingestion/news-ingestion.processor';
import { NewsIngestionRepository } from '../../src/ingestion/news-ingestion.repository';
import { NewsIngestion } from '../../src/ingestion/news-ingestion.entity';
import { NewsIngestionStatus } from '../../src/ingestion/enums/news-ingestion-status.enum';
import { ChunkCollectionService } from '../../src/ingestion/chunk-collection.service';
import { IngestionService } from '../../src/ingestion/ingestion.service';

jest.mock('../../src/ingestion/ingestion.service', (): { IngestionService: jest.Mock } => ({ IngestionService: jest.fn() }));

describe('NewsIngestionProcessor', (): void => {
    let module: TestingModule;
    let processor: NewsIngestionProcessor;
    let job: NewsIngestion;
    const summary: string = 'Готовый пересказ.';
    const ready: jest.Mock = jest.fn();
    const claim: jest.Mock = jest.fn();
    const find: jest.Mock = jest.fn();
    const ingest: jest.Mock = jest.fn();
    const complete: jest.Mock = jest.fn();
    const fail: jest.Mock = jest.fn();
    const source: DataSource = new DataSource({ type: 'postgres' });

    beforeEach(async (): Promise<void> => {
        jest.resetAllMocks();
        jest.spyOn(Logger.prototype, 'log').mockImplementation((): void => {});
        jest.spyOn(Logger.prototype, 'error').mockImplementation((): void => {});
        job = Object.assign(new NewsIngestion(), {
            id: 7, articleId: 42, collectionName: 'chunks',
            summaryHash: createHash('sha256').update(summary).digest('hex'),
            status: NewsIngestionStatus.PROCESSING,
        });
        ready.mockResolvedValue(undefined);
        claim.mockResolvedValue(job);
        find.mockResolvedValue(summary);
        ingest.mockResolvedValue(3);
        complete.mockResolvedValue(undefined);
        fail.mockResolvedValue(undefined);
        module = await Test.createTestingModule({ providers: [
            NewsIngestionProcessor,
            { provide: DataSource, useValue: source },
            { provide: ConfigService, useValue: { getOrThrow: (): string => 'chunks' } },
            { provide: NewsIngestionRepository, useValue: { claimNextPending: claim, findCompletedSummary: find, complete, markFailed: fail } },
            { provide: ChunkCollectionService, useValue: { ensureReady: ready } },
            { provide: IngestionService, useValue: { ingestSummary: ingest } },
        ] }).compile();
        processor = module.get(NewsIngestionProcessor);
    });

    afterEach(async (): Promise<void> => {
        await module.close();
        jest.restoreAllMocks();
    });

    it('completes only after ingestion has confirmed all chunks', async (): Promise<void> => {
        ingest.mockImplementation(async (): Promise<number> => {
            expect(complete).not.toHaveBeenCalled();
            return 3;
        });
        expect(await processor.processNext()).toBe(true);
        expect(claim).toHaveBeenCalledWith('chunks', source.manager);
        expect(ingest).toHaveBeenCalledWith(42, summary);
        expect(complete).toHaveBeenCalledWith(7, job.summaryHash, 3, source.manager);
        expect(fail).not.toHaveBeenCalled();
    });

    it('does nothing for an empty queue', async (): Promise<void> => {
        claim.mockResolvedValue(null);
        expect(await processor.processNext()).toBe(false);
        expect(find).not.toHaveBeenCalled();
        expect(ingest).not.toHaveBeenCalled();
    });

    it('does not claim a job when collection validation fails', async (): Promise<void> => {
        ready.mockRejectedValue(new Error('Wrong collection'));
        await expect(processor.processNext()).rejects.toThrow('Wrong collection');
        expect(claim).not.toHaveBeenCalled();
        expect(fail).not.toHaveBeenCalled();
    });

    it.each([null, 'Changed summary'])('rejects missing or changed summary %j before embedding', async (text: string | null): Promise<void> => {
        find.mockResolvedValue(text);
        await expect(processor.processNext()).rejects.toThrow('ingestion 7');
        expect(ingest).not.toHaveBeenCalled();
        expect(complete).not.toHaveBeenCalled();
        expect(fail).toHaveBeenCalledWith(7, job.summaryHash, source.manager);
    });

    it('marks a partial ingestion failure without completing the job or leaking errors', async (): Promise<void> => {
        ingest.mockRejectedValue(new Error('secret-api-key'));
        await expect(processor.processNext()).rejects.toThrow('Не удалось выполнить задание ingestion 7.');
        expect(complete).not.toHaveBeenCalled();
        expect(fail).toHaveBeenCalled();
        expect(JSON.stringify(jest.mocked(Logger.prototype.error).mock.calls)).not.toContain('secret-api-key');
    });

    it('handles a failure when saving completion', async (): Promise<void> => {
        complete.mockRejectedValue(new Error('DB unavailable'));
        await expect(processor.processNext()).rejects.toThrow('ingestion 7');
        expect(fail).toHaveBeenCalled();
    });

    it('reports failure even if marking FAILED also fails', async (): Promise<void> => {
        ingest.mockRejectedValue(new Error('API failure'));
        fail.mockRejectedValue(new Error('DB failure'));
        await expect(processor.processNext()).rejects.toThrow('ingestion 7');
        expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to save ingestion failure: jobId=7');
    });
});
