import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { BOT_COMMANDS } from './telegram-bot.constants';
import { NewsArticlesFormatter } from '../telegram-messaging/formatters/news-articles.formatter';
import { NewsArticlesService } from '../news_article/news-articles.service';
import { NewsTopicsService } from '../news-topic/news-topics.service';
import { NewsSubscriptionService } from '../news-subscription/news-subscription.service';
import type { NewsTopicDto } from '../news-topic/dto/news-topic.dto';
import { TelegramMessageDto } from '../telegram-messaging/dto/telegram-message.dto';
import {NewsArticleSummaryDto} from "../news_article/dto/news-article-summary.dto";
import {SimilarNewsGraph} from "../news-search/graphs/similar-news.graph";
import {SimilarNewsGraphState} from "../news-search/graphs/similar-news.state";
import {TelegramCallbackButtonDto} from "../telegram-messaging/dto/telegram-callback-button.dto";
import {NewsSearchService} from "../news-search/news-search.service";

@Injectable()
export class TelegramBotService implements OnModuleInit {
  constructor(
    @InjectBot()
    private readonly bot: Telegraf,
    private readonly newsArticlesService: NewsArticlesService,
    private readonly newsArticlesFormatter: NewsArticlesFormatter,
    private readonly newsTopicsService: NewsTopicsService,
    private readonly newsSubscriptionService: NewsSubscriptionService,
    private readonly similarNewsGraph: SimilarNewsGraph,
    private readonly newsSearchService: NewsSearchService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bot.telegram.setMyCommands(BOT_COMMANDS);
  }

  getWelcomeMessage(firstName?: string): string {
    return `
Привет${firstName ? `, ${firstName}` : ''}! 👋

Я бот для подписки на IT-новости.

Ты можешь выбрать темы, получать новости и управлять своими подписками.

Выбери действие в меню ниже 👇
`;
  }

  getHelpMessage(): string {
    return `
Доступные команды:

/start — запустить бота
/topics — показать темы новостей
/my_subscriptions — показать мои подписки
/unsubscribe — отписаться от темы
/latest — последние новости
/help — помощь
`;
  }

  async getTopics(): Promise<NewsTopicDto[]> {
    return this.newsTopicsService.getAllActive();
  }

  async getUserSubscriptions(telegramId: string): Promise<NewsTopicDto[]> {
    return this.newsSubscriptionService.getSubscribedTopics(telegramId);
  }

  async subscribeToTopic(telegramId: string, topicId: number): Promise<string> {
    const topic: NewsTopicDto = await this.newsSubscriptionService.subscribe(
      telegramId,
      topicId,
    );

    return `Подписка на тему «${topic.name}» сохранена.`;
  }

  async unsubscribeFromTopic(
    telegramId: string,
    topicId: number,
  ): Promise<string> {
    const topic: NewsTopicDto | null =
      await this.newsSubscriptionService.unsubscribe(telegramId, topicId);

    if (topic === null) {
      return 'Подписки на эту тему уже нет.';
    }

    return `Подписка на тему «${topic.name}» отключена.`;
  }

  async getMySubscriptionsMessage(telegramId: string): Promise<string> {
    const topics: NewsTopicDto[] = await this.getUserSubscriptions(telegramId);

    if (topics.length === 0) {
      return 'У тебя пока нет подписок. Открой «📰 Темы новостей».';
    }

    const names: string = topics
      .map((topic: NewsTopicDto): string => `✅ ${topic.name}`)
      .join('\n');

    return `Твои подписки:\n\n${names}`;
  }

  async getLatestNewsMessages(
    telegramId: string,
  ): Promise<TelegramMessageDto[]> {
    const topics: NewsTopicDto[] = await this.getUserSubscriptions(telegramId);

    if (topics.length === 0) {
      return [
        {
          text: 'Сначала выбери интересующие темы в разделе «📰 Темы новостей».',
          buttons: [],
        },
      ];
    }

    const topicIds: number[] = topics.map(
      (topic: NewsTopicDto): number => topic.id,
    );

    const articles: NewsArticleSummaryDto[] =
        await this.newsArticlesService.getLatestSummariesByTopicIds(
            topicIds,
        );

    if (articles.length === 0) {
      return [
        {
          text: 'По твоим подпискам пока нет сохранённых публикаций.',
          buttons: [],
        },
      ];
    }

    return articles.map(
        (article: NewsArticleSummaryDto): TelegramMessageDto =>
            this.newsArticlesFormatter.formatSummary({
              id: article.id,
              title: article.title,
              summary: article.summary,
              url: article.url,
              topics: article.topics,
            }),
    );
  }

  async getSimilarNewsMessages(
      articleId: number,
  ): Promise<TelegramMessageDto[]> {
    const result: SimilarNewsGraphState =
        await this.similarNewsGraph.search(articleId);

    if (!result.indexed) {
      return [{
        text: 'Эта новость ещё не готова для поиска похожих. Попробуй позже.',
        buttons: [],
      }];
    }

    if (result.articles.length === 0) {
      return [{
        text: 'В архиве пока нет похожих новостей.',
        buttons: [],
      }];
    }

    const buttons: TelegramCallbackButtonDto[] = result.articles
        .slice(0, 3)
        .map(
            (article: NewsArticleSummaryDto): TelegramCallbackButtonDto => {
              const title: string = article.title
                  .replace(/\s+/g, ' ')
                  .trim();

              return {
                text: title || `Статья №${article.id}`,
                callbackData: `article:${article.id}`,
              };
            },
        );

    return [{
      text: 'Похожие статьи:',
      buttons,
    }];
  }

  async getArticleMessage(
      articleId: number,
  ): Promise<TelegramMessageDto> {
    const article: NewsArticleSummaryDto | null =
        await this.newsSearchService.getArticle(articleId);

    if (article === null) {
      return {
        text: 'Эта статья больше недоступна или её пересказ ещё не готов.',
        buttons: [],
      };
    }

    return this.newsArticlesFormatter.formatSummary({
      id: article.id,
      title: article.title,
      summary: article.summary,
      url: article.url,
      topics: article.topics,
    });
  }
}
