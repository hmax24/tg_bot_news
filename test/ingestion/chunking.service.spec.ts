import { ConfigService } from '@nestjs/config';
import { ChunkingService } from '../../src/ingestion/chunking.service';
import type { NewsSummaryChunk } from '../../src/ingestion/types/news-summary-chunk';

describe('ChunkingService', (): void => {
    function service(size: string = '800', overlap: string = '150'): ChunkingService {
        const config: ConfigService = new ConfigService();
        jest.spyOn(config, 'getOrThrow').mockImplementation((key: string): string =>
            key === 'NEWS_CHUNK_SIZE' ? size : overlap,
        );
        return new ChunkingService(config);
    }

    afterEach((): void => { jest.restoreAllMocks(); });

    it('splits 2000 characters with exact overlap and preserves the text', (): void => {
        const text: string = Array.from({ length: 2000 }, (_: unknown, index: number): string => String(index % 10)).join('');
        const chunks: NewsSummaryChunk[] = service().chunkSummary(42, text);
        expect(chunks.map((chunk: NewsSummaryChunk): number[] => [chunk.startOffset, chunk.endOffset])).toEqual([[0, 800], [650, 1450], [1300, 2000]]);
        expect(chunks.map((chunk: NewsSummaryChunk): number => chunk.index)).toEqual([0, 1, 2]);
        expect(chunks.every((chunk: NewsSummaryChunk): boolean => chunk.articleId === 42)).toBe(true);
        expect(chunks[0].text + chunks[1].text.slice(150) + chunks[2].text.slice(150)).toBe(text);
    });

    it.each([1, 799, 800, 1450])('does not produce an overlap-only tail for length %i', (length: number): void => {
        const chunks: NewsSummaryChunk[] = service().chunkSummary(1, 'я'.repeat(length));
        expect(chunks).toHaveLength(length <= 800 ? 1 : 2);
        expect(chunks[chunks.length - 1].endOffset).toBe(length);
    });

    it('uses Unicode code points and offsets after trimming', (): void => {
        expect(service('3', '1').chunkSummary(1, '  А😀БВГ  ')).toEqual([
            { articleId: 1, index: 0, text: 'А😀Б', startOffset: 0, endOffset: 3 },
            { articleId: 1, index: 1, text: 'БВГ', startOffset: 2, endOffset: 5 },
        ]);
    });

    it('supports zero overlap', (): void => {
        expect(service('2', '0').chunkSummary(1, 'абв').map((chunk: NewsSummaryChunk): string => chunk.text)).toEqual(['аб', 'в']);
    });

    it.each(['', ' \n '])('rejects empty text %j', (text: string): void => {
        expect((): NewsSummaryChunk[] => service().chunkSummary(1, text)).toThrow();
    });

    it.each([0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1])('rejects invalid article id %s', (id: number): void => {
        expect((): NewsSummaryChunk[] => service().chunkSummary(id, 'text')).toThrow();
    });

    it.each([['0', '0'], ['abc', '1'], ['800', '800'], ['800', '-1'], ['1.5', '0'], ['800', 'NaN']])('rejects size %s / overlap %s', (size: string, overlap: string): void => {
        expect((): NewsSummaryChunk[] => service(size, overlap).chunkSummary(1, 'text')).toThrow();
    });
});
