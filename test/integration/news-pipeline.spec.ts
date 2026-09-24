import {randomUUID} from 'node:crypto';
import {NewsArticleContentStatus} from '../../src/news-article-content/enums/news-article-content-status.enum';
import {NewsArticleContent} from '../../src/news-article-content/news-article-content.entity';
import {NewsArticleContentCompletionService} from '../../src/news-article-content/news-article-content-completion.service';
import {ConfigService} from '@nestjs/config';
import {DataSource} from 'typeorm';
import type {DataSourceOptions} from 'typeorm';
import {createDatabaseConfig} from '../../src/database/database.config';
import {NewsArticle} from '../../src/news_article/news-article.entity';
import {NewsTopic} from '../../src/news-topic/news-topic.entity';
import {NewsBroadcast} from '../../src/news-broadcast/news-broadcast.entity';
import {TelegramUser} from '../../src/telegram-user/telegram-user.entity';
import {NewsArticlesService} from '../../src/news_article/news-articles.service';
import {NewsArticlesRepository} from '../../src/news_article/news-articles.repository';
import {NewsTopicsService} from '../../src/news-topic/news-topics.service';
import {NewsTopicsRepository} from '../../src/news-topic/news-topics.repository';
import {NewsTopicsMapper} from '../../src/news-topic/dto/news-topics.mapper';
import {NewsArticlesMapper} from '../../src/news_article/dto/news-articles.mapper';
import {DevToArticlesMapper} from '../../src/news_article/sources/dev-to/dev-to-articles.mapper';
import {DevToClient} from '../../src/news_article/sources/dev-to/dev-to-client';
import type {DevToArticle} from '../../src/news_article/sources/dev-to/dev-to-article';
import {NewsBroadcastRepository} from '../../src/news-broadcast/news-broadcast.repository';
import {NewsBroadcastRecipientsRepository} from '../../src/news-broadcast/news-broadcast-recipients.repository';
import {NewsBroadcastService} from '../../src/news-broadcast/news-broadcast.service';
import {NewsBroadcastProcessor} from '../../src/news-broadcast/news-broadcast-processor.service';
import {TelegramUsersRepository} from '../../src/telegram-user/telegram-users.repository';
import {TelegramUsersService} from '../../src/telegram-user/telegram-users.service';
import {NewsSubscriptionService} from '../../src/news-subscription/news-subscription.service';
import {NewsSubscriptionRepository} from '../../src/news-subscription/news-subscription.repository';
import {NewsSubscription} from '../../src/news-subscription/news-subscription.entity';
import {NewsArticlesFormatter} from '../../src/telegram-messaging/formatters/news-articles.formatter';
import {TelegramMessageSender} from '../../src/telegram-messaging/telegram-message-sender.service';
import {TelegramSendLimiter} from '../../src/telegram-messaging/telegram-send-limiter.service';
import {Telegraf} from 'telegraf';
import {NewsArticleContentRepository} from "../../src/news-article-content/news-article-content.repository";
import {NewsArticleContentService} from "../../src/news-article-content/news-article-content.service";

// Never load .env. CI supplies a dedicated PostgreSQL database explicitly.
const databaseUrl: string | undefined = process.env.TEST_DATABASE_URL;
const integration: typeof describe = databaseUrl ? describe : describe.skip;

integration('PostgreSQL migrations, import and broadcast', (): void => {
    let source: DataSource;
    let admin: DataSource | undefined;
    let isolatedDatabase: string;
    let databaseCreated: boolean;
    let service: NewsArticlesService;
    let contentService: NewsArticleContentService;
    let broadcasts: NewsBroadcastService;
    let subscriptions: NewsSubscriptionService;
    let broadcastRepository: NewsBroadcastRepository;
    let articlesRepository: NewsArticlesRepository;
    let client: DevToClient;
    let getLatestArticlesSpy: jest.SpiedFunction<
        DevToClient['getLatestArticles']
    >;

    beforeEach(async (): Promise<void> => {
        admin = undefined;
        databaseCreated = false;
        const url: URL = new URL(databaseUrl!);
        if (url.pathname !== '/tg_news_test') {
            throw new Error(
                'TEST_DATABASE_URL must target the dedicated tg_news_test database',
            );
        }
        isolatedDatabase = `tg_news_test_${randomUUID().replaceAll('-', '')}`;
        const config: ConfigService = new ConfigService({
            DB_HOST: url.hostname,
            DB_PORT: url.port || '5432',
            DB_USERNAME: decodeURIComponent(url.username),
            DB_PASSWORD: decodeURIComponent(url.password),
            DB_DATABASE: 'tg_news_test',
        });
        const databaseOptions: DataSourceOptions = createDatabaseConfig(config);
        if (databaseOptions.type !== 'postgres') {
            throw new Error('Integration tests require PostgreSQL.');
        }
        admin = new DataSource({
            type: 'postgres',
            host: databaseOptions.host,
            port: databaseOptions.port,
            username: databaseOptions.username,
            password: databaseOptions.password,
            database: 'tg_news_test',
        });
        await admin.initialize();
        await admin.query(`CREATE DATABASE "${isolatedDatabase}" TEMPLATE template0`);
        databaseCreated = true;
        source = new DataSource({
            ...databaseOptions,
            database: isolatedDatabase,
            schema: 'public',
        });
        await source.initialize();
        await source.runMigrations();
        const users: TelegramUsersService = new TelegramUsersService(
            new TelegramUsersRepository(source.getRepository(TelegramUser)),
        );
        const topics: NewsTopicsService = new NewsTopicsService(
            new NewsTopicsRepository(source.getRepository(NewsTopic)),
            new NewsTopicsMapper(),
        );
        broadcastRepository = new NewsBroadcastRepository(
            source.getRepository(NewsBroadcast),
        );
        broadcasts = new NewsBroadcastService(
            broadcastRepository,
            users,
            new NewsBroadcastRecipientsRepository(source.getRepository(TelegramUser)),
        );
        subscriptions = new NewsSubscriptionService(
            source,
            users,
            topics,
            new NewsSubscriptionRepository(source.getRepository(NewsSubscription)),
            new NewsTopicsMapper(),
        );
        articlesRepository = new NewsArticlesRepository(
            source.getRepository(NewsArticle),
        );
        client = new DevToClient();
        getLatestArticlesSpy = jest
            .spyOn(client, 'getLatestArticles')
            .mockResolvedValue([]);
        contentService = new NewsArticleContentService(new NewsArticleContentRepository());
        service = new NewsArticlesService(
            source,
            client,
            new DevToArticlesMapper(),
            new NewsArticlesMapper(),
            topics,
            articlesRepository,
            contentService,
        );
    }, 30000);

    afterEach(async (): Promise<void> => {
        jest.restoreAllMocks();
        try {
            if (source?.isInitialized) {
                await source.destroy();
            }
            if (admin?.isInitialized && databaseCreated) {
                if (!/^tg_news_test_[a-f0-9]{32}$/.test(isolatedDatabase)) {
                    throw new Error('Refusing to drop an unexpected database name');
                }
                await admin.query(`DROP DATABASE "${isolatedDatabase}"`);
            }
        } finally {
            if (admin?.isInitialized) {
                await admin.destroy();
            }
        }
    }, 30000);

    const article = (
        id: number,
        tags: string[] = ['python', 'newtopic'],
    ): DevToArticle => ({
        id,
        title: `Article ${id}`,
        description: 'Description',
        url: `https://example.com/articles/${id}`,
        published_at: new Date(Date.UTC(2026, 0, 1, 0, id)).toISOString(),
        tag_list: tags,
    });

    it('applies all migrations, activates exactly the agreed topics and matches entity schema', async (): Promise<void> => {
        const names: string[] = (
            await source.getRepository(NewsTopic).findBy({isActive: true})
        )
            .map((topic: NewsTopic): string => topic.name)
            .sort();
        expect(names).toEqual(
            [
                'ai',
                'webdev',
                'programming',
                'api',
                'devops',
                'security',
                'python',
                'opensource',
                'javascript',
                'automation',
                'architecture',
                'machinelearning',
                'llm',
                'seo',
                'node',
                'android',
                'web3',
                'testing',
                'cybersecurity',
                'typescript',
                'backend',
                'devtools',
                'webscraping',
                'aiagents',
                'kubernetes',
                'linux',
                'react',
                'cloud',
                'datascience',
                'postgres',
            ].sort(),
        );
        expect((await source.driver.createSchemaBuilder().log()).upQueries).toEqual(
            [],
        );
        expect(await source.runMigrations()).toEqual([]);
    });

    it('rolls back topic activation without deleting existing topics and restores the old default', async (): Promise<void> => {
        await source.undoLastMigration(); // news_article_contents
        await source.undoLastMigration(); // sourceArticleId
        await source.undoLastMigration(); // isSent
        await source.undoLastMigration(); // active topics
        const topic: NewsTopic = await source
            .getRepository(NewsTopic)
            .save({name: 'legacy'});
        await source.runMigrations();
        expect(
            (await source.getRepository(NewsTopic).findOneByOrFail({id: topic.id}))
                .isActive,
        ).toBe(false);
        await source.undoLastMigration(); // news_article_contents
        await source.undoLastMigration(); // sourceArticleId
        await source.undoLastMigration(); // isSent
        await source.undoLastMigration(); // active topics
        expect(
            (await source.getRepository(NewsTopic).findOneByOrFail({id: topic.id}))
                .isActive,
        ).toBe(true);
        expect(
            (await source.getRepository(NewsTopic).save({name: 'after_rollback'}))
                .isActive,
        ).toBe(true);
    });

    it('imports topic links and creates one content job without broadcasting duplicates', async (): Promise<void> => {
        getLatestArticlesSpy.mockResolvedValue([article(1)]);
        expect(await service.importLatestArticles()).toBe(1);
        const saved: NewsArticle = await source
            .getRepository(NewsArticle)
            .findOneOrFail({
                where: {url: article(1).url},
                relations: {topics: true},
            });
        expect(
            saved.topics.map((topic: NewsTopic): string => topic.name).sort(),
        ).toEqual(['newtopic', 'python']);
        expect(
            saved.topics.find(
                (topic: NewsTopic): boolean => topic.name === 'newtopic',
            )?.isActive,
        ).toBe(false);
        getLatestArticlesSpy.mockResolvedValue([
            {...article(1), title: 'Changed'},
        ]);
        expect(await service.importLatestArticles()).toBe(0);
        expect(
            (
                await source
                    .getRepository(NewsArticle)
                    .findOneByOrFail({id: saved.id})
            ).title,
        ).toBe('Article 1');
        expect(await source.getRepository(NewsBroadcast).count()).toBe(0);
        expect(await source.getRepository(NewsArticleContent).countBy({articleId: saved.id})).toBe(1);
    });

    it('rolls back article and new topics if creating the job fails', async (): Promise<void> => {
        getLatestArticlesSpy.mockResolvedValue([article(1)]);
        jest
            .spyOn(contentService, 'createForArticle')
            .mockRejectedValue(new Error('job failure'));
        await expect(service.importLatestArticles()).rejects.toThrow('job failure');
        expect(await source.getRepository(NewsArticleContent).count()).toBe(0);
        expect(await source.getRepository(NewsArticle).count()).toBe(0);
        expect(
            await source.getRepository(NewsTopic).countBy({name: 'newtopic'}),
        ).toBe(0);
        expect(await source.getRepository(NewsBroadcast).count()).toBe(0);
    });

    it('does not write data on an empty response or an API error', async (): Promise<void> => {
        expect(await service.importLatestArticles()).toBe(0);
        getLatestArticlesSpy.mockRejectedValue(new Error('API timeout'));
        await expect(service.importLatestArticles()).rejects.toThrow('API timeout');
        expect(await source.getRepository(NewsArticle).count()).toBe(0);
        expect(await source.getRepository(NewsBroadcast).count()).toBe(0);
    });

    it('excludes inactive topics and inactive users from recipients', async (): Promise<void> => {
        const python: NewsTopic = await source
            .getRepository(NewsTopic)
            .findOneByOrFail({name: 'python'});
        const react: NewsTopic = await source
            .getRepository(NewsTopic)
            .findOneByOrFail({name: 'react'});
        await subscriptions.subscribe('100', python.id);
        await subscriptions.subscribe('200', react.id);
        await source
            .getRepository(NewsTopic)
            .update(python.id, {isActive: false});
        await source
            .getRepository(TelegramUser)
            .update({telegramId: '200'}, {isActive: false});
        getLatestArticlesSpy.mockResolvedValue([article(1, ['python', 'react'])]);
        await service.importLatestArticles();
        const job: NewsBroadcast | null =
            await completeImportedArticle(article(1).url);
        expect(job).not.toBeNull();
        expect(
            await broadcasts.getRecipientsBatch(
                job!.articleId,
                0,
                job!.maxRecipientUserId,
            ),
        ).toEqual([]);
    });

    async function completeImportedArticle(url: string): Promise<NewsBroadcast | null> {
        const saved: NewsArticle = await source.getRepository(NewsArticle).findOneByOrFail({url});
        const repository: NewsArticleContentRepository = new NewsArticleContentRepository();
        expect(await repository.claimPending(saved.id, source.manager)).toBe(true);
        const content: NewsArticleContent = await source.getRepository(NewsArticleContent).findOneByOrFail({articleId: saved.id});
        await repository.saveFullTextIfMissing(content.id, 'Full article text.', source.manager);
        const completion: NewsArticleContentCompletionService = new NewsArticleContentCompletionService(source, repository, broadcasts);
        await completion.complete(saved.id, 'Готовый пересказ тестовой статьи.');
        return broadcastRepository.findNextPending();
    }


    it('commits the summary and broadcast together', async (): Promise<void> => {
        getLatestArticlesSpy.mockResolvedValue([article(1)]);
        await service.importLatestArticles();
        expect(await source.getRepository(NewsBroadcast).count()).toBe(0);
        const job: NewsBroadcast | null = await completeImportedArticle(article(1).url);
        expect(job).not.toBeNull();
        const content: NewsArticleContent = await source.getRepository(NewsArticleContent).findOneByOrFail({articleId: job!.articleId});
        expect(content.status).toBe(NewsArticleContentStatus.COMPLETED);
        expect(content.summary).toBe('Готовый пересказ тестовой статьи.');
        expect(await broadcastRepository.getCompletedSummary(job!.articleId)).toBe(content.summary);
    });

    it('rolls back both the summary and an inserted broadcast if completion fails', async (): Promise<void> => {
        getLatestArticlesSpy.mockResolvedValue([article(1)]);
        await service.importLatestArticles();
        // Throw after the real INSERT, so rollback must undo both writes.
        const insertSpy: jest.SpiedFunction<NewsBroadcastRepository['createPending']> = jest.spyOn(broadcastRepository, 'createPending');
        insertSpy.mockImplementation(async (articleId: number, maxRecipientUserId: number, manager: import('typeorm').EntityManager): Promise<void> => {
            await manager.getRepository(NewsBroadcast).insert({articleId, maxRecipientUserId});
            throw new Error('failure after insert');
        });
        await expect(completeImportedArticle(article(1).url)).rejects.toThrow('failure after insert');
        const content: NewsArticleContent = await source.getRepository(NewsArticleContent).findOneByOrFail({});
        expect(content.status).toBe(NewsArticleContentStatus.PROCESSING);
        expect(content.summary).toBeNull();
        expect(content.fullText).toBe('Full article text.');
        expect(await source.getRepository(NewsBroadcast).count()).toBe(0);
    });

    it('preserves an existing completed broadcast when a summary is created', async (): Promise<void> => {
        getLatestArticlesSpy.mockResolvedValue([article(1)]);
        await service.importLatestArticles();
        const saved: NewsArticle = await source.getRepository(NewsArticle).findOneByOrFail({url: article(1).url});
        await broadcasts.createForArticle(saved.id, source.manager);
        const original: NewsBroadcast = await source.getRepository(NewsBroadcast).findOneByOrFail({articleId: saved.id});
        await broadcastRepository.markCompleted(original.id);
        const before: NewsBroadcast = await source.getRepository(NewsBroadcast).findOneByOrFail({id: original.id});
        expect(await completeImportedArticle(article(1).url)).toBeNull();
        const after: NewsBroadcast = await source.getRepository(NewsBroadcast).findOneByOrFail({id: original.id});
        expect(after.status).toBe('COMPLETED');
        expect(after.completedAt).toEqual(before.completedAt);
        expect(after.maxRecipientUserId).toBe(before.maxRecipientUserId);
        expect(await source.getRepository(NewsBroadcast).count()).toBe(1);
        expect(await broadcastRepository.getCompletedSummary(saved.id)).toBe('Готовый пересказ тестовой статьи.');
    });

    it('skips an older broadcast without a summary and selects the ready one', async (): Promise<void> => {
        getLatestArticlesSpy.mockResolvedValue([article(1), article(2)]);
        await service.importLatestArticles();
        const older: NewsArticle = await source.getRepository(NewsArticle).findOneByOrFail({url: article(1).url});
        await broadcasts.createForArticle(older.id, source.manager);
        expect(await broadcastRepository.findNextPending()).toBeNull();
        const ready: NewsBroadcast | null = await completeImportedArticle(article(2).url);
        expect(ready).not.toBeNull();
        expect(ready!.articleId).not.toBe(older.id);
    });

    it('returns five unique latest articles and loads all their topics', async (): Promise<void> => {
        getLatestArticlesSpy.mockResolvedValue(
            Array.from(
                {length: 7},
                (_value: unknown, index: number): DevToArticle =>
                    article(index + 1, ['python', 'react']),
            ),
        );
        await service.importLatestArticles();
        const topics: NewsTopic[] = await source
            .getRepository(NewsTopic)
            .findBy({isActive: true});
        const result: NewsArticle[] = await articlesRepository.findLatestByTopicIds(
            topics.map((topic: NewsTopic): number => topic.id),
        );
        expect(result.map((item: NewsArticle): string => item.title)).toEqual([
            'Article 7',
            'Article 6',
            'Article 5',
            'Article 4',
            'Article 3',
        ]);
        expect(
            result.every((item: NewsArticle): boolean => item.topics.length === 2),
        ).toBe(true);
    });

    it('delivers once for overlapping subscriptions, excludes late users and completes the job', async (): Promise<void> => {
        const python: NewsTopic = await source
            .getRepository(NewsTopic)
            .findOneByOrFail({name: 'python'});
        const react: NewsTopic = await source
            .getRepository(NewsTopic)
            .findOneByOrFail({name: 'react'});
        await subscriptions.subscribe('100', python.id);
        await subscriptions.subscribe('100', react.id);
        await subscriptions.subscribe('200', react.id);
        getLatestArticlesSpy.mockResolvedValue([article(1, ['python', 'react'])]);
        await service.importLatestArticles();
        await completeImportedArticle(article(1).url);
        await subscriptions.unsubscribe('200', react.id);
        await subscriptions.subscribe('300', python.id); // Created after the job's upper bound.
        const sender: TelegramMessageSender = new TelegramMessageSender(
            new Telegraf('test'),
            new TelegramSendLimiter(),
        );
        const send: jest.SpiedFunction<TelegramMessageSender['send']> = jest
            .spyOn(sender, 'send')
            .mockResolvedValue(undefined);
        const processor: NewsBroadcastProcessor = new NewsBroadcastProcessor(
            broadcastRepository,
            broadcasts,
            new NewsArticlesMapper(),
            new NewsArticlesFormatter(),
            sender,
        );
        await processor.processNext();
        await processor.processNext();
        expect(send).toHaveBeenCalledTimes(1);
        expect(send.mock.calls[0][1].text).toContain('Готовый пересказ тестовой статьи.');
        expect(send.mock.calls[0][1].text).not.toContain('Description');
        expect(send).toHaveBeenCalledWith(
            '100',
            expect.objectContaining({
                text: expect.stringContaining('Темы: python, react') as unknown,
                buttons: [
                    {
                        text: 'Оригинал статьи',
                        url: article(1).url,
                    },
                ],
            }),
        );
        expect(await source.getRepository(NewsBroadcast).count()).toBe(1);
        expect(await broadcastRepository.findNextPending()).toBeNull();
        const jobs: NewsBroadcast[] = await source
            .getRepository(NewsBroadcast)
            .find();
        expect(jobs[0].status).toBe('COMPLETED');
        expect(jobs[0].completedAt).toBeInstanceOf(Date);
    });
});
