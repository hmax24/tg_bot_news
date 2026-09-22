import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { NewsSubscriptionRepository } from '../../src/news-subscription/news-subscription.repository';
import { NewsSubscription } from '../../src/news-subscription/news-subscription.entity';
import { NewsTopic } from '../../src/news-topic/news-topic.entity';
import { TelegramUser } from '../../src/telegram-user/telegram-user.entity';

class MetadataDataSource extends DataSource {
    async prepareMetadata(): Promise<void> {
        await this.buildMetadatas();
    }
}

describe('Subscription row lock', (): void => {
    it('locks only the subscription and parameterizes the user ID', async (): Promise<void> => {
        const source: MetadataDataSource = new MetadataDataSource({
            type: 'postgres', entities: [NewsSubscription, NewsTopic, TelegramUser],
        });
        await source.prepareMetadata();
        const repository: Repository<NewsSubscription> = source.getRepository(NewsSubscription);
        const builder: SelectQueryBuilder<NewsSubscription> = repository.createQueryBuilder('subscription');
        jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(builder);
        jest.spyOn(builder, 'getOne').mockResolvedValue(null);
        const subscriptions: NewsSubscriptionRepository = new NewsSubscriptionRepository(repository);
        await subscriptions.findForUpdate(42, source.manager);
        const sql: string = builder.getSql();
        expect(sql).toContain('FOR UPDATE OF subscription');
        expect(sql).not.toContain('JOIN');
        expect(builder.getParameters()).toEqual({ userId: 42 });
    });
});
