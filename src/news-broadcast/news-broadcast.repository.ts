import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';

import { NewsBroadcast } from './news-broadcast.entity';
import { NewsBroadcastStatus } from './enums/news-broadcast-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import {NewsArticleContentStatus} from "../news-article-content/enums/news-article-content-status.enum";
import {NewsArticleContent} from "../news-article-content/news-article-content.entity";

@Injectable()
export class NewsBroadcastRepository {
  constructor(
    @InjectRepository(NewsBroadcast)
    private readonly repository: Repository<NewsBroadcast>,
  ) {}

  async createPending(
      articleId: number,
      maxRecipientUserId: number,
      manager: EntityManager,
  ): Promise<void> {
    const repository: Repository<NewsBroadcast> =
        manager.getRepository(NewsBroadcast);

    await repository
        .createQueryBuilder()
        .insert()
        .into(NewsBroadcast)
        .values({
          articleId,
          maxRecipientUserId,
          status: NewsBroadcastStatus.PENDING,
        })
        .orIgnore()
        .execute();
  }

  async findNextPending(): Promise<NewsBroadcast | null> {
    return this.repository
        .createQueryBuilder('broadcast')
        .innerJoin(
            NewsArticleContent,
            'content',
            'content.articleId = broadcast.articleId',
        )
        .leftJoinAndSelect('broadcast.article', 'article')
        .leftJoinAndSelect('article.topics', 'topic')
        .where('broadcast.status = :broadcastStatus', {
          broadcastStatus: NewsBroadcastStatus.PENDING,
        })
        .andWhere('content.status = :contentStatus', {
          contentStatus: NewsArticleContentStatus.COMPLETED,
        })
        .andWhere('content.summary IS NOT NULL')
        .andWhere("BTRIM(content.summary) <> ''")
        .orderBy('broadcast.id', 'ASC')
        .take(1)
        .getOne();
  }

  async markProcessing(id: number): Promise<void> {
    await this.repository.update(id, {
      status: NewsBroadcastStatus.PROCESSING,
    });
  }

  async markCompleted(id: number): Promise<void> {
    await this.repository.update(id, {
      status: NewsBroadcastStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  async getCompletedSummary(articleId: number): Promise<string | null> {
    const content: NewsArticleContent | null =
        await this.repository.manager.findOne(
            NewsArticleContent,
            {
              where: {
                articleId,
                status: NewsArticleContentStatus.COMPLETED,
              },
              select: {
                summary: true,
              },
            },
        );

    return content?.summary ?? null;
  }
}
