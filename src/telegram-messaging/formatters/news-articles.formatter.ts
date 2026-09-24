import { Injectable } from '@nestjs/common';

import type { NewsArticleDto } from '../../news_article/dto/news-article.dto';
import type { NewsTopicDto } from '../../news-topic/dto/news-topic.dto';
import { TelegramMessageDto } from '../dto/telegram-message.dto';
import {NewsArticleSummaryMessageDto} from "../dto/news-article-summary-message.dto";

@Injectable()
export class NewsArticlesFormatter {
  private readonly maxMessageLength: number = 4000;
  private readonly maxTitleLength: number = 300;
  private readonly maxTopicsLength: number = 500;

  format(article: NewsArticleDto): TelegramMessageDto {
    const title: string = this.truncate(article.title, this.maxTitleLength);

    const topicNames: string[] = article.topics.map(
      (topic: NewsTopicDto): string => topic.name,
    );

    const uniqueTopicNames: string[] = [...new Set(topicNames)];

    const topics: string =
      uniqueTopicNames.length > 0
        ? this.truncate(
            `Темы: ${uniqueTopicNames.join(', ')}`,
            this.maxTopicsLength,
          )
        : '';

    const header: string = topics.length > 0 ? `${title}\n\n${topics}` : title;

    const availableDescriptionLength: number = Math.max(
      0,
      this.maxMessageLength - header.length - 2,
    );

    const description: string = this.truncate(
      article.description,
      availableDescriptionLength,
    );

    const text: string =
      description.length > 0 ? `${header}\n\n${description}` : header;

    return {
      text,
      buttons: [
        {
          text: 'Оригинал статьи',
          url: article.url,
        },
      ],
    };
  }

  private truncate(value: string, maxLength: number): string {
    if (maxLength <= 0) {
      return '';
    }

    if (value.length <= maxLength) {
      return value;
    }

    const suffix: string = '…';
    let end: number = maxLength - suffix.length;

    // Не разрываем пару UTF-16, например внутри эмодзи.
    if (end > 0) {
      const lastCodeUnit: number = value.charCodeAt(end - 1);

      if (lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff) {
        end--;
      }
    }

    return `${value.slice(0, end)}${suffix}`;
  }

  formatSummary(
      article: NewsArticleSummaryMessageDto,
  ): TelegramMessageDto {
    const summary: string = article.summary.trim();

    if (summary.length === 0) {
      throw new Error(
          'Нельзя сформировать сообщение с пустым пересказом.',
      );
    }

    if (summary.length > 2000) {
      throw new Error(
          'Пересказ превышает лимит 2000 символов.',
      );
    }

    const title: string = this.truncate(
        article.title,
        this.maxTitleLength,
    );

    const topicNames: string[] = article.topics.map(
        (topic: NewsTopicDto): string => topic.name,
    );

    const uniqueTopicNames: string[] = [...new Set(topicNames)];

    const topics: string =
        uniqueTopicNames.length > 0
            ? this.truncate(
                `Темы: ${uniqueTopicNames.join(', ')}`,
                this.maxTopicsLength,
            )
            : '';

    const parts: string[] = [title, topics, summary];

    const text: string = parts
        .filter((part: string): boolean => part.length > 0)
        .join('\n\n');

    return {
      text,
      buttons: [
        {
          text: 'Оригинал статьи',
          url: article.url,
        },
      ],
    };
  }
}
