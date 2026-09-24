import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { TelegramUser } from '../telegram-user/telegram-user.entity';
import { NewsSubscription } from '../news-subscription/news-subscription.entity';
import type { NewsBroadcastRecipientDto } from './dto/news-broadcast-recipient.dto';

@Injectable()
export class NewsBroadcastRecipientsRepository {
  constructor(
    @InjectRepository(TelegramUser)
    private readonly repository: Repository<TelegramUser>,
  ) {}

  async findBatch(
    articleId: number,
    afterUserId: number,
    maxRecipientUserId: number,
    limit: number,
  ): Promise<NewsBroadcastRecipientDto[]> {
    const query: SelectQueryBuilder<TelegramUser> =
      this.repository.createQueryBuilder('recipient');

    const subscriptionQuery: SelectQueryBuilder<NewsSubscription> = query
      .subQuery()
      .select('1')
      .from(NewsSubscription, 'subscription')
      .innerJoin('subscription.newsTopics', 'topic')
      .innerJoin(
        'news_article_topics',
        'articleTopic',
        'articleTopic.news_topic_id = topic.id',
      )
      .where('subscription.telegram_user_id = recipient.id')
      .andWhere('subscription.isActive = :active')
      .andWhere('topic.isActive = :active')
      .andWhere('articleTopic.news_article_id = :articleId');

    return query
      .select('recipient.id', 'userId')
      .addSelect('recipient.telegramId', 'telegramId')
      .where('recipient.isActive = :active')
      .andWhere('recipient.id > :afterUserId')
      .andWhere('recipient.id <= :maxRecipientUserId')
      .andWhere(`EXISTS ${subscriptionQuery.getQuery()}`)
      .setParameters({
        articleId,
        afterUserId,
        maxRecipientUserId,
        active: true,
      })
      .orderBy('recipient.id', 'ASC')
      .limit(limit)
      .getRawMany<NewsBroadcastRecipientDto>();
  }
}
