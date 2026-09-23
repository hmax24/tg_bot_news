import { Injectable } from '@nestjs/common';

import type { NewsArticleDto } from '../../news_article/dto/news-article.dto';
import type { NewsTopicDto } from '../../news-topic/dto/news-topic.dto';

@Injectable()
export class NewsArticlesFormatter {
    private readonly maxMessageLength: number = 4000;
    private readonly maxTitleLength: number = 300;
    private readonly maxTopicsLength: number = 500;

    format(article: NewsArticleDto): string {
        const title: string = this.truncate(
            article.title,
            this.maxTitleLength,
        );

        const footer: string = `Оригинал: ${article.url}`;

        const baseMessage: string = `${title}\n\n${footer}`;

        if (baseMessage.length > this.maxMessageLength) {
            throw new Error(
                `Article ${article.id}: title and URL exceed message limit`,
            );
        }

        const topicNames: string[] = article.topics.map(
            (topic: NewsTopicDto): string => topic.name,
        );

        const uniqueTopicNames: string[] = [...new Set(topicNames)];

        const topicsText: string = uniqueTopicNames.length > 0
            ? `Темы: ${uniqueTopicNames.join(', ')}`
            : '';

        const availableTopicsLength: number = Math.max(
            0,
            this.maxMessageLength - baseMessage.length - 2,
        );

        const topics: string = this.truncate(
            topicsText,
            Math.min(
                this.maxTopicsLength,
                availableTopicsLength,
            ),
        );

        const header: string = topics.length > 0
            ? `${title}\n\n${topics}`
            : title;

        const messageWithoutDescription: string =
            `${header}\n\n${footer}`;

        const availableDescriptionLength: number = Math.max(
            0,
            this.maxMessageLength -
            messageWithoutDescription.length -
            2,
        );

        const description: string = this.truncate(
            article.description,
            availableDescriptionLength,
        );

        if (description.length === 0) {
            return messageWithoutDescription;
        }

        return `${header}\n\n${description}\n\n${footer}`;
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

            if (lastCodeUnit >= 0xD800 && lastCodeUnit <= 0xDBFF) {
                end--;
            }
        }

        return `${value.slice(0, end)}${suffix}`;
    }
}