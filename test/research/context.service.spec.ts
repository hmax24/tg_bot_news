import { ContextService } from '../../src/research/context.service';
import type { NewsChunkSearchResult } from '../../src/vector-store/qdrant/interfaces/news-chunk-search-result';

function chunk(text: string, start: number = 0, overrides: Partial<NewsChunkSearchResult> = {}): NewsChunkSearchResult {
    return { pointId: `${start}`, articleId: 1, summaryHash: 'a'.repeat(64), index: 0,
        text, startOffset: start, endOffset: start + Array.from(text).length, score: 0.8, ...overrides };
}

describe('ContextService', (): void => {
    const service: ContextService = new ContextService();

    it('returns no context for no candidates', (): void => {
        expect(service.generateContext([])).toEqual([]);
    });

    it('merges shuffled overlapping Unicode fragments without mutating candidates', (): void => {
        const input: NewsChunkSearchResult[] = [chunk('😀CD', 2, { score: 0.9 }), chunk('AB😀', 0)];
        const original: string = JSON.stringify(input);
        expect(service.generateContext(input)).toEqual([expect.objectContaining({ text: 'AB😀CD', startOffset: 0, endOffset: 5, score: 0.9 })]);
        expect(JSON.stringify(input)).toBe(original);
    });

    it('handles contained, duplicate and adjacent fragments without repeating text', (): void => {
        expect(service.generateContext([chunk('ABCD'), chunk('BC', 1), chunk('ABCD'), chunk('EF', 4)]))
            .toEqual([expect.objectContaining({ text: 'ABCDEF', endOffset: 6 })]);
    });

    it('keeps gaps, articles and summary versions separate', (): void => {
        expect(service.generateContext([chunk('AB'), chunk('DE', 3), chunk('XY', 0, { articleId: 2 }), chunk('ZZ', 0, { summaryHash: 'b'.repeat(64) })])).toHaveLength(4);
    });

    it('rejects inconsistent overlapping text', (): void => {
        expect((): unknown => service.generateContext([chunk('ABC'), chunk('XD', 2)]))
            .toThrow('Перекрывающиеся чанки содержат разные тексты.');
    });

    it('applies the six-fragment limit after merging and ranks by best score', (): void => {
        const input: NewsChunkSearchResult[] = Array.from({ length: 8 }, (_: unknown, index: number): NewsChunkSearchResult => chunk('A', 0, { articleId: index + 1, score: index / 10 }));
        input.push(chunk('AB', 0, { articleId: 1, score: 0.99 }));
        expect(service.generateContext(input).map((item): number => item.articleId)).toEqual([1, 8, 7, 6, 5, 4]);
    });
});
