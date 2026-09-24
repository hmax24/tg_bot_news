import { Injectable } from '@nestjs/common';
import axios from 'axios';
import type { AxiosResponse } from 'axios';

import type { DevToArticle } from './dev-to-article';
import { DevToArticleDetails } from './dev-to-article-details';

@Injectable()
export class DevToClient {
  async getLatestArticles(): Promise<DevToArticle[]> {
    const response: AxiosResponse<DevToArticle[]> = await axios.get<
      DevToArticle[]
    >('https://dev.to/api/articles', {
      headers: {
        Accept: 'application/vnd.forem.api-v1+json',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
      },
      params: {
        state: 'fresh',
        page: 1,
        per_page: 21,
      },
      timeout: 10_000,
    });

    return response.data;
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
