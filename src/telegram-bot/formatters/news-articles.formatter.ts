import { Injectable } from '@nestjs/common';
import type { NewsArticleDto } from '../../news_article/dto/news-article.dto';

@Injectable()
export class NewsArticlesFormatter {
    private readonly maxMessageLength: number = 4000;
    private readonly maxTitleLength: number = 300;

    format(article: NewsArticleDto): string {
        const title: string =
            article.title.slice(0, this.maxTitleLength);

        const footer: string = `Оригинал: ${article.url}`;

        const baseMessage: string = `${title}\n\n${footer}`;

        if (baseMessage.length > this.maxMessageLength) {
            throw new Error(
                `Article ${article.id}: title and URL exceed message limit`,
            );
        }

        const availableLength: number =
            this.maxMessageLength - baseMessage.length - 2;

        if (availableLength <= 0 || article.description.length === 0) {
            return baseMessage;
        }

        const description: string =
            article.description.slice(0, availableLength);

        return `${title}\n\n${description}\n\n${footer}`;
    }
}
