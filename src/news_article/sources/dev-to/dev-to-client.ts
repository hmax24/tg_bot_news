import { Injectable } from '@nestjs/common';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { DevToArticle } from './dev-to-article';

@Injectable()
export class DevToClient {
    async getLatestArticles(): Promise<DevToArticle[]> {
        const response: AxiosResponse<DevToArticle[]> =
            await axios.get<DevToArticle[]>(
                'https://dev.to/api/articles/latest',
                {
                    headers: {
                        Accept: 'application/vnd.forem.api-v1+json',
                        'Accept-Encoding': 'identity',
                        'Cache-Control': 'no-cache',
                    },
                    params: { page: 1, per_page: 21 },
                    timeout: 10_000,
                },
            );

        return response.data;
    }
}
