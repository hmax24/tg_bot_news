import { DataSource } from 'typeorm';
import { Telegraf } from 'telegraf';
import { NewsBroadcastProcessor } from '../../src/news-broadcast/news-broadcast-processor.service';
import { NewsBroadcastRepository } from '../../src/news-broadcast/news-broadcast.repository';
import { NewsBroadcastService } from '../../src/news-broadcast/news-broadcast.service';
import { NewsBroadcastRecipientsRepository } from '../../src/news-broadcast/news-broadcast-recipients.repository';
import { NewsBroadcast } from '../../src/news-broadcast/news-broadcast.entity';
import { NewsBroadcastStatus } from '../../src/news-broadcast/enums/news-broadcast-status.enum';
import { TelegramUsersService } from '../../src/telegram-user/telegram-users.service';
import { TelegramUsersRepository } from '../../src/telegram-user/telegram-users.repository';
import { TelegramUser } from '../../src/telegram-user/telegram-user.entity';
import { TelegramMessageSender } from '../../src/telegram-messaging/telegram-message-sender.service';
import { TelegramSendLimiter } from '../../src/telegram-messaging/telegram-send-limiter.service';
import { NewsArticlesFormatter } from '../../src/telegram-messaging/formatters/news-articles.formatter';
import { NewsArticlesMapper } from '../../src/news_article/dto/news-articles.mapper';
import { NewsArticle } from '../../src/news_article/news-article.entity';
import { NewsArticleContent } from '../../src/news-article-content/news-article-content.entity';

describe('Broadcast processor', (): void => {
  let processor: NewsBroadcastProcessor;
  let repository: NewsBroadcastRepository;
  let service: NewsBroadcastService;
  let sender: TelegramMessageSender;
  let job: NewsBroadcast;
  let content: NewsArticleContent;
  let findNextPendingSpy: jest.SpiedFunction<
    NewsBroadcastRepository['findNextPending']
  >;
  let markProcessingSpy: jest.SpiedFunction<
    NewsBroadcastRepository['markProcessing']
  >;
  let markCompletedSpy: jest.SpiedFunction<
    NewsBroadcastRepository['markCompleted']
  >;
  let getRecipientsBatchSpy: jest.SpiedFunction<
    NewsBroadcastService['getRecipientsBatch']
  >;
  let isEligibleRecipientSpy: jest.SpiedFunction<
    NewsBroadcastService['isEligibleRecipient']
  >;
  let sendSpy: jest.SpiedFunction<TelegramMessageSender['send']>;

  beforeEach((): void => {
    // No connection is opened. All repository operations are intercepted below.
    const source: DataSource = new DataSource({ type: 'postgres' });
    content = new NewsArticleContent();
    content.summary = 'Готовый пересказ.';
    jest.spyOn(source.manager, 'findOne').mockResolvedValue(content);
    repository = new NewsBroadcastRepository(
      source.getRepository(NewsBroadcast),
    );
    service = new NewsBroadcastService(
      repository,
      new TelegramUsersService(
        new TelegramUsersRepository(source.getRepository(TelegramUser)),
      ),
      new NewsBroadcastRecipientsRepository(source.getRepository(TelegramUser)),
    );
    sender = new TelegramMessageSender(
      new Telegraf('test'),
      new TelegramSendLimiter(),
    );
    processor = new NewsBroadcastProcessor(
      repository,
      service,
      new NewsArticlesMapper(),
      new NewsArticlesFormatter(),
      sender,
    );
    const article: NewsArticle = Object.assign(new NewsArticle(), {
      id: 5,
      title: 'Title',
      description: 'Body',
      url: 'https://example.com/5',
      topics: [],
    });
    job = Object.assign(new NewsBroadcast(), {
      id: 8,
      articleId: 5,
      article,
      maxRecipientUserId: 120,
      status: NewsBroadcastStatus.PENDING,
    });
    findNextPendingSpy = jest
      .spyOn(repository, 'findNextPending')
      .mockResolvedValue(job);
    markProcessingSpy = jest
      .spyOn(repository, 'markProcessing')
      .mockResolvedValue(undefined);
    markCompletedSpy = jest
      .spyOn(repository, 'markCompleted')
      .mockResolvedValue(undefined);
    getRecipientsBatchSpy = jest
      .spyOn(service, 'getRecipientsBatch')
      .mockResolvedValue([]);
    isEligibleRecipientSpy = jest
      .spyOn(service, 'isEligibleRecipient')
      .mockResolvedValue(true);
    sendSpy = jest.spyOn(sender, 'send').mockResolvedValue(undefined);
  });

  afterEach((): void => {
    jest.restoreAllMocks();
  });

  it('does nothing when there is no pending job', async (): Promise<void> => {
    findNextPendingSpy.mockResolvedValue(null);
    await processor.processNext();
    expect(markProcessingSpy).not.toHaveBeenCalled();
    expect(sendSpy).not.toHaveBeenCalled();
    expect(markCompletedSpy).not.toHaveBeenCalled();
  });

  it('advances the cursor even past an unsubscribed recipient and processes the next batch', async (): Promise<void> => {
    getRecipientsBatchSpy
      .mockResolvedValueOnce([
        { userId: 1, telegramId: '100' },
        { userId: 2, telegramId: '200' },
      ])
      .mockResolvedValueOnce([{ userId: 110, telegramId: '300' }])
      .mockResolvedValueOnce([]);
    isEligibleRecipientSpy
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    await processor.processNext();
    expect(getRecipientsBatchSpy).toHaveBeenNthCalledWith(1, 5, 0, 120);
    expect(getRecipientsBatchSpy).toHaveBeenNthCalledWith(2, 5, 2, 120);
    expect(getRecipientsBatchSpy).toHaveBeenNthCalledWith(3, 5, 110, 120);
    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).not.toHaveBeenCalledWith('200', expect.anything());
    expect(markCompletedSpy).toHaveBeenCalledWith(8);
  });

  it('completes a job with no eligible recipients without sending', async (): Promise<void> => {
    await processor.processNext();
    expect(sendSpy).not.toHaveBeenCalled();
    expect(markCompletedSpy).toHaveBeenCalledWith(8);
  });

  it('sends the saved summary instead of the original description', async (): Promise<void> => {
    getRecipientsBatchSpy.mockResolvedValueOnce([{ userId: 1, telegramId: '100' }]);
    await processor.processNext();
    expect(sendSpy).toHaveBeenCalledWith('100', {
      text: 'Title\n\nГотовый пересказ.',
      buttons: [{ text: 'Оригинал статьи', url: 'https://example.com/5' }],
    });
  });

  it('does not start sending when the summary is missing', async (): Promise<void> => {
    content.summary = null;
    await expect(processor.processNext()).rejects.toThrow('Готовый пересказ статьи 5 не найден.');
    expect(markProcessingSpy).not.toHaveBeenCalled();
    expect(sendSpy).not.toHaveBeenCalled();
    expect(markCompletedSpy).not.toHaveBeenCalled();
  });

  it('does not report successful completion when Telegram rejects a message', async (): Promise<void> => {
    getRecipientsBatchSpy.mockResolvedValueOnce([
      { userId: 1, telegramId: '100' },
    ]);
    sendSpy.mockRejectedValue(new Error('Telegram unavailable'));
    await expect(processor.processNext()).rejects.toThrow(
      'Telegram unavailable',
    );
    expect(markCompletedSpy).not.toHaveBeenCalled();
    // Recovery of PROCESSING jobs is not implemented by the application yet.
  });
});
