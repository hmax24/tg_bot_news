import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NewsArticleContentJob } from '../../src/news-article-content/news-article-content.job';
import { NewsArticleContentProcessor } from '../../src/news-article-content/news-article-content-processor.service';

// Unit tests call run() directly; no timers or real scheduler are started.
jest.mock('@nestjs/schedule', (): { Cron: () => MethodDecorator } => ({
  Cron: (): MethodDecorator => (): void => {},
}));

jest.mock('../../src/news-article-content/news-article-content-processor.service', (): {
  NewsArticleContentProcessor: jest.Mock;
} => ({ NewsArticleContentProcessor: jest.fn() }));

describe('NewsArticleContentJob', (): void => {
  let module: TestingModule | undefined;
  let logError: jest.SpiedFunction<Logger['error']>;
  const processNext: jest.Mock<Promise<boolean>, []> = jest.fn();

  async function createJob(settings: Record<string, string> = {}): Promise<NewsArticleContentJob> {
    module = await Test.createTestingModule({
      providers: [
        NewsArticleContentJob,
        { provide: ConfigService, useValue: new ConfigService(settings) },
        { provide: NewsArticleContentProcessor, useValue: { processNext } },
      ],
    }).compile();
    return module.get<NewsArticleContentJob>(NewsArticleContentJob);
  }

  beforeEach((): void => {
    module = undefined;
    processNext.mockReset().mockResolvedValue(true);
    const environment: NodeJS.ProcessEnv = { ...process.env };
    delete environment.NEWS_CONTENT_PROCESSING_ENABLED;
    delete environment.GOOGLE_API_KEY;
    jest.replaceProperty(process, 'env', environment);
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation((): void => {});
  });

  afterEach(async (): Promise<void> => {
    await module?.close();
    jest.restoreAllMocks();
  });

  it.each([{}, { NEWS_CONTENT_PROCESSING_ENABLED: 'false' }])(
    'does not process articles when disabled: %j',
    async (settings: Record<string, string>): Promise<void> => {
      const job: NewsArticleContentJob = await createJob(settings);
      await job.run();
      expect(processNext).not.toHaveBeenCalled();
    },
  );

  it('runs one processing attempt when enabled', async (): Promise<void> => {
    const job: NewsArticleContentJob = await createJob({ NEWS_CONTENT_PROCESSING_ENABLED: 'true', GOOGLE_API_KEY: 'test-key' });
    await job.run();
    expect(processNext).toHaveBeenCalledTimes(1);
    expect(logError).not.toHaveBeenCalled();
  });

  it('handles an empty queue without reporting an error', async (): Promise<void> => {
    processNext.mockResolvedValue(false);
    const job: NewsArticleContentJob = await createJob({ NEWS_CONTENT_PROCESSING_ENABLED: 'true', GOOGLE_API_KEY: 'test-key' });
    await job.run();
    expect(logError).not.toHaveBeenCalled();
  });

  it('contains processing errors and can run again without logging sensitive details', async (): Promise<void> => {
    processNext.mockRejectedValueOnce(new Error('secret-key-sensitive-payload'));
    const job: NewsArticleContentJob = await createJob({ NEWS_CONTENT_PROCESSING_ENABLED: 'true', GOOGLE_API_KEY: 'test-key' });
    await expect(job.run()).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledWith('Article processing job failed. Check article processing status.');
    await job.run();
    expect(processNext).toHaveBeenCalledTimes(2);
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it.each(['TRUE', '1', ''])('rejects invalid enabled flag: %j', async (value: string): Promise<void> => {
    await expect(createJob({ NEWS_CONTENT_PROCESSING_ENABLED: value })).rejects.toThrow('NEWS_CONTENT_PROCESSING_ENABLED');
    expect(processNext).not.toHaveBeenCalled();
  });

  it('requires a key when enabled', async (): Promise<void> => {
    await expect(createJob({ NEWS_CONTENT_PROCESSING_ENABLED: 'true' })).rejects.toThrow('GOOGLE_API_KEY');
    expect(processNext).not.toHaveBeenCalled();
  });

  it.each(['', '   '])('rejects a blank key: %j', async (key: string): Promise<void> => {
    await expect(createJob({ NEWS_CONTENT_PROCESSING_ENABLED: 'true', GOOGLE_API_KEY: key })).rejects.toThrow('GOOGLE_API_KEY');
    expect(processNext).not.toHaveBeenCalled();
  });
});
