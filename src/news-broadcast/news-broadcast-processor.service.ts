import { Injectable, Logger } from '@nestjs/common';

import { NewsBroadcast } from './news-broadcast.entity';
import { NewsBroadcastRepository } from './news-broadcast.repository';
import { NewsBroadcastService } from './news-broadcast.service';
import type { NewsBroadcastRecipientDto } from './dto/news-broadcast-recipient.dto';

import { NewsArticlesMapper } from '../news_article/dto/news-articles.mapper';
import type { NewsArticleDto } from '../news_article/dto/news-article.dto';
import { NewsArticlesFormatter } from '../telegram-messaging/formatters/news-articles.formatter';
import { TelegramMessageSender } from '../telegram-messaging/telegram-message-sender.service';
import { TelegramMessageDto } from '../telegram-messaging/dto/telegram-message.dto';

@Injectable()
export class NewsBroadcastProcessor {
  private readonly logger: Logger = new Logger(NewsBroadcastProcessor.name);

  constructor(
    private readonly repository: NewsBroadcastRepository,
    private readonly broadcastService: NewsBroadcastService,
    private readonly articlesMapper: NewsArticlesMapper,
    private readonly formatter: NewsArticlesFormatter,
    private readonly sender: TelegramMessageSender,
  ) {}

  async processNext(): Promise<void> {
    const broadcast: NewsBroadcast | null =
      await this.repository.findNextPending();

    if (broadcast === null) {
      return;
    }

    const summary: string | null =
        await this.repository.getCompletedSummary(broadcast.articleId);

    if (summary === null || summary.trim().length === 0) {
      throw new Error(
          `Готовый пересказ статьи ${broadcast.articleId} не найден.`,
      );
    }

    const article: NewsArticleDto = this.articlesMapper.mapToDto(
        broadcast.article,
    );

    const message: TelegramMessageDto = this.formatter.formatSummary({
      title: article.title,
      summary,
      url: article.url,
      topics: article.topics,
    });

    await this.repository.markProcessing(broadcast.id);

    let afterUserId: number = 0;
    let sentCount: number = 0;

    while (true) {
      const recipients: NewsBroadcastRecipientDto[] =
        await this.broadcastService.getRecipientsBatch(
          broadcast.articleId,
          afterUserId,
          broadcast.maxRecipientUserId,
        );

      if (recipients.length === 0) {
        break;
      }

      for (let index: number = 0; index < recipients.length; index++) {
        const recipient: NewsBroadcastRecipientDto = recipients[index];

        const eligible: boolean =
          await this.broadcastService.isEligibleRecipient(
            broadcast.articleId,
            recipient.userId,
          );

        if (eligible) {
          await this.sender.send(recipient.telegramId, message);

          sentCount++;
        }

        afterUserId = recipient.userId;
      }
    }

    await this.repository.markCompleted(broadcast.id);

    this.logger.log(
      `Broadcast completed: id=${broadcast.id}, sent=${sentCount}`,
    );
  }
}
