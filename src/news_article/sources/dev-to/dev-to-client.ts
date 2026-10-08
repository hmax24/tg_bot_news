import {Injectable, Logger} from '@nestjs/common';
import axios from 'axios';
import type { AxiosResponse } from 'axios';

import type { DevToArticle } from './dev-to-article';
import { DevToArticleDetails } from './dev-to-article-details';

@Injectable()
export class DevToClient {
  private readonly logger: Logger = new Logger(DevToClient.name);

// Допускаем кеш возрастом до двух интервалов импорта.
  private readonly maxCacheAgeSeconds: number = 20 * 60;

  async getLatestArticles(): Promise<DevToArticle[]> {
    try {
      return await this.loadArticles(
          'https://dev.to/api/articles',
          {
            state: 'fresh',
            page: 1,
            per_page: 21,
          },
      );
    } catch {
      this.logger.warn(
          'Основной запрос DEV.to не прошёл проверку. ' +
          'Пробуем резервный endpoint.',
      );
    }

    try {
      return await this.loadArticles(
          'https://dev.to/api/articles/latest',
          {
            page: 1,
            per_page: 21,
          },
      );
    } catch {
      throw new Error(
          'Оба запроса DEV.to завершились ошибкой ' +
          'или вернули устаревший кеш.',
      );
    }
  }

  private async loadArticles(
      url: string,
      params: Record<string, string | number>,
  ): Promise<DevToArticle[]> {
    const response: AxiosResponse<unknown> =
        await axios.get<unknown>(url, {
          headers: {
            Accept: 'application/vnd.forem.api-v1+json',
            'Accept-Encoding': 'identity',
            'Cache-Control': 'no-cache',
          },
          params,
          timeout: 10_000,
        });

    const rawAge: unknown = response.headers.age;
    let ageSeconds: number | null = null;

    if (rawAge !== undefined && rawAge !== null) {
      const ageText: string = String(rawAge).trim();

      if (!/^\d+$/.test(ageText)) {
        throw new Error('DEV.to вернул некорректный Age.');
      }

      ageSeconds = Number(ageText);

      if (!Number.isSafeInteger(ageSeconds)) {
        throw new Error('DEV.to вернул некорректный Age.');
      }

      if (ageSeconds > this.maxCacheAgeSeconds) {
        this.logger.warn(
            `Устаревший кеш DEV.to: url=${url}, ` +
            `ageSeconds=${ageSeconds}`,
        );

        throw new Error('Кеш DEV.to устарел.');
      }
    }

    const data: unknown = response.data;

    if (!Array.isArray(data)) {
      throw new Error('DEV.to вернул некорректный список статей.');
    }

    const articles: DevToArticle[] = [];

    for (const item of data as unknown[]) {
      if (typeof item !== 'object' || item === null) {
        throw new Error('DEV.to вернул некорректную статью.');
      }

      const article: Record<string, unknown> =
          item as Record<string, unknown>;

      if (
          typeof article.id !== 'number' ||
          !Number.isSafeInteger(article.id) ||
          article.id <= 0 ||
          typeof article.title !== 'string' ||
          typeof article.description !== 'string' ||
          typeof article.url !== 'string' ||
          typeof article.published_at !== 'string' ||
          !Number.isFinite(Date.parse(article.published_at)) ||
          !Array.isArray(article.tag_list) ||
          !article.tag_list.every(
              (tag: unknown): tag is string =>
                  typeof tag === 'string',
          )
      ) {
        throw new Error('DEV.to вернул некорректные поля статьи.');
      }

      articles.push({
        id: article.id,
        title: article.title,
        description: article.description,
        url: article.url,
        published_at: article.published_at,
        tag_list: article.tag_list,
      });
    }

    this.logger.log(
        `DEV.to response: url=${url}, ` +
        `ageSeconds=${ageSeconds ?? 'unknown'}, ` +
        `count=${articles.length}`,
    );

    return articles;
  }

  async getArticleById(articleId: number): Promise<DevToArticleDetails> {
    if (!Number.isSafeInteger(articleId) || articleId <= 0) {
      throw new Error('Некорректный идентификатор статьи DEV.to.');
    }

    const response: AxiosResponse<DevToArticleDetails> =
      await axios.get<DevToArticleDetails>(
        `https://dev.to/api/articles/${articleId}`,
        {
          headers: {
            Accept: 'application/vnd.forem.api-v1+json',
            'Accept-Encoding': 'identity',
            'Cache-Control': 'no-cache',
          },
          timeout: 10_000,
        },
      );

    const article: DevToArticleDetails = response.data;

    if (
      !article ||
      article.id !== articleId ||
      typeof article.body_markdown !== 'string' ||
      article.body_markdown.trim().length === 0
    ) {
      throw new Error(`DEV.to не вернул полный текст статьи ${articleId}.`);
    }

    return article;
  }
}
