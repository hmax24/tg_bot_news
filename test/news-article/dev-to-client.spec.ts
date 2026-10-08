import { Logger } from '@nestjs/common';
import axios from 'axios';
import { DevToClient } from '../../src/news_article/sources/dev-to/dev-to-client';
import type { DevToArticle } from '../../src/news_article/sources/dev-to/dev-to-article';

describe('DevToClient import fallback', (): void => {
    let client: DevToClient;
    let get: jest.SpiedFunction<typeof axios.get>;
    const primary: string = 'https://dev.to/api/articles';
    const fallback: string = 'https://dev.to/api/articles/latest';
    const article: DevToArticle = {
        id: 42, title: 'News', description: 'Description',
        url: 'https://dev.to/example/news', published_at: '2026-10-08T01:00:00Z', tag_list: ['typescript'],
    };

    function response(data: unknown = [article], age: unknown = '0'): object {
        return { data, headers: age === undefined ? {} : { age } };
    }

    beforeEach((): void => {
        client = new DevToClient();
        get = jest.spyOn(axios, 'get');
        // Unconfigured calls must never access the network.
        get.mockRejectedValue(new Error('Unexpected HTTP call'));
        jest.spyOn(Logger.prototype, 'log').mockImplementation((): void => {});
        jest.spyOn(Logger.prototype, 'warn').mockImplementation((): void => {});
    });

    afterEach((): void => { jest.restoreAllMocks(); });

    it.each(['0', '1200'])('accepts fresh cache including the age boundary: %s', async (age: string): Promise<void> => {
        get.mockResolvedValueOnce(response([article], age));
        expect(await client.getLatestArticles()).toEqual([article]);
        expect(get).toHaveBeenCalledTimes(1);
        expect(get).toHaveBeenCalledWith(primary, {
            headers: { Accept: 'application/vnd.forem.api-v1+json', 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' },
            params: { state: 'fresh', page: 1, per_page: 21 }, timeout: 10_000,
        });
    });

    it('accepts an absent Age without treating an old publication as stale cache', async (): Promise<void> => {
        get.mockResolvedValueOnce({ data: [{ ...article, published_at: '2020-01-01T00:00:00Z' }], headers: {} });
        expect(await client.getLatestArticles()).toHaveLength(1);
        expect(get).toHaveBeenCalledTimes(1);
        expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('ageSeconds=unknown'));
    });

    it('accepts an empty fresh feed without a fallback', async (): Promise<void> => {
        get.mockResolvedValueOnce(response([]));
        expect(await client.getLatestArticles()).toEqual([]);
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('discards a stale primary response and returns only fallback articles', async (): Promise<void> => {
        const newer: DevToArticle = { ...article, id: 43 };
        get.mockResolvedValueOnce(response([article], '1201')).mockResolvedValueOnce(response([newer]));
        expect(await client.getLatestArticles()).toEqual([newer]);
        expect(get).toHaveBeenCalledTimes(2);
        expect(get).toHaveBeenNthCalledWith(2, fallback, expect.objectContaining({
            params: { page: 1, per_page: 21 }, timeout: 10_000,
        }));
    });

    it('uses the fallback after a network error', async (): Promise<void> => {
        get.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(response());
        expect(await client.getLatestArticles()).toEqual([article]);
        expect(get).toHaveBeenCalledTimes(2);
    });

    it.each(['-1', 'NaN', '', '1.5', '9007199254740992'])('rejects invalid Age and tries the fallback: %j', async (age: string): Promise<void> => {
        get.mockResolvedValueOnce(response([article], age)).mockResolvedValueOnce(response());
        expect(await client.getLatestArticles()).toEqual([article]);
        expect(get).toHaveBeenCalledTimes(2);
    });

    it.each([
        { error: 'invalid feed' }, [null], [{ ...article, id: 0 }],
        [{ ...article, published_at: 'invalid' }], [{ ...article, tag_list: [1] }],
    ].map((data: unknown): { data: unknown } => ({ data })))('rejects malformed primary data and tries the fallback %#', async ({ data }: { data: unknown }): Promise<void> => {
        get.mockResolvedValueOnce(response(data)).mockResolvedValueOnce(response());
        expect(await client.getLatestArticles()).toEqual([article]);
        expect(get).toHaveBeenCalledTimes(2);
    });

    it.each(['stale', 'network', 'invalid'])('fails explicitly when both endpoints fail: %s', async (kind: string): Promise<void> => {
        if (kind === 'stale') {
            get.mockResolvedValue(response([article], '57000'));
        } else if (kind === 'invalid') {
            get.mockResolvedValue(response({ error: 'invalid feed' }));
        } else {
            get.mockRejectedValue(new Error('network unavailable'));
        }
        await expect(client.getLatestArticles()).rejects.toThrow('Оба запроса DEV.to');
        expect(get).toHaveBeenCalledTimes(2);
        expect(get.mock.calls.map((call): string => call[0])).toEqual([primary, fallback]);
    });
});
