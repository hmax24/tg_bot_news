import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { NewsSubscription } from './news-subscription.entity';

@Injectable()
export class NewsSubscriptionRepository {
  constructor(
    @InjectRepository(NewsSubscription)
    private readonly repository: Repository<NewsSubscription>,
  ) {}

  async insertIfMissing(userId: number, manager: EntityManager): Promise<void> {
    const repository: Repository<NewsSubscription> =
      manager.getRepository(NewsSubscription);

    await repository
      .createQueryBuilder()
      .insert()
      .into(NewsSubscription)
      .values({
        telegramUser: { id: userId },
      })
      .orIgnore()
      .execute();
  }

  async findForUpdate(
    userId: number,
    manager: EntityManager,
  ): Promise<NewsSubscription | null> {
    const repository: Repository<NewsSubscription> =
      manager.getRepository(NewsSubscription);

    return repository
      .createQueryBuilder('subscription')
      .where('subscription.telegram_user_id = :userId', { userId })
      .setLock('pessimistic_write', undefined, ['subscription'])
      .getOne();
  }

  async findWithTopics(
    id: number,
    manager: EntityManager,
  ): Promise<NewsSubscription> {
    const repository: Repository<NewsSubscription> =
      manager.getRepository(NewsSubscription);

    return repository.findOneOrFail({
      where: { id },
      relations: {
        newsTopics: true,
      },
    });
  }

  async save(
    subscription: NewsSubscription,
    manager: EntityManager,
  ): Promise<void> {
    const repository: Repository<NewsSubscription> =
      manager.getRepository(NewsSubscription);

    await repository.save(subscription);
  }

  async findActiveByTelegramId(
    telegramId: string,
  ): Promise<NewsSubscription | null> {
    return this.repository.findOne({
      where: {
        isActive: true,
        telegramUser: {
          telegramId,
          isActive: true,
        },
      },
      relations: {
        newsTopics: true,
      },
    });
  }
}
