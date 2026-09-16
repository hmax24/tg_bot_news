import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { NewsSubscriptionService } from './news-subscription.service';
import { NewsSubscriptionRepository } from './news-subscription.repository';
import { TelegramUsersService } from '../telegram-user/telegram-users.service';
import { NewsTopicsService } from '../news-topic/news-topics.service';
import { NewsTopicsMapper } from '../news-topic/dto/news-topics.mapper';

describe('Unsubscribe unknown user', (): void => {
    it('does not create a user or write a subscription', async (): Promise<void> => {
        const source: DataSource = new DataSource({ type: 'postgres' });
        const findUser: jest.Mock = jest.fn().mockResolvedValue(null);
        const createUser: jest.Mock = jest.fn();
        const findSubscription: jest.Mock = jest.fn();
        const saveSubscription: jest.Mock = jest.fn();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NewsSubscriptionService,
                NewsTopicsMapper,
                { provide: DataSource, useValue: {
                    transaction: async (work: (manager: EntityManager) => Promise<void>): Promise<void> => work(source.manager),
                } },
                { provide: TelegramUsersService, useValue: { findByTelegramId: findUser, getOrCreateByTelegramId: createUser } },
                { provide: NewsTopicsService, useValue: {} },
                { provide: NewsSubscriptionRepository, useValue: { findForUpdate: findSubscription, save: saveSubscription } },
            ],
        }).compile();
        try {
            const service: NewsSubscriptionService = module.get(NewsSubscriptionService);
            await service.unsubscribe('12345', 1);
            expect(findUser).toHaveBeenCalledWith('12345', source.manager);
            expect(createUser).not.toHaveBeenCalled();
            expect(findSubscription).not.toHaveBeenCalled();
            expect(saveSubscription).not.toHaveBeenCalled();
        } finally {
            await module.close();
        }
    });
});
