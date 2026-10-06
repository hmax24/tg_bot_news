import { Injectable } from '@nestjs/common';

import type { NewsChunkSearchResult } from '../vector-store/qdrant/interfaces/news-chunk-search-result';
import type { ResearchContextFragment } from './types/research-context-fragment';

@Injectable()
export class ContextService {
    private readonly maxFragments: number = 6;

    generateContext(
        chunks: NewsChunkSearchResult[],
    ): ResearchContextFragment[] {
        const groups: Map<string, ResearchContextFragment[]> =
            new Map<string, ResearchContextFragment[]>();

        for (const chunk of chunks) {
            const key: string =
                `${chunk.articleId}:${chunk.summaryHash}`;

            const fragment: ResearchContextFragment = {
                articleId: chunk.articleId,
                summaryHash: chunk.summaryHash,
                text: chunk.text,
                startOffset: chunk.startOffset,
                endOffset: chunk.endOffset,
                score: chunk.score,
            };

            const group: ResearchContextFragment[] | undefined =
                groups.get(key);

            if (group === undefined) {
                groups.set(key, [fragment]);
            } else {
                group.push(fragment);
            }
        }

        const merged: ResearchContextFragment[] = [];

        for (const group of groups.values()) {
            group.sort(
                (
                    left: ResearchContextFragment,
                    right: ResearchContextFragment,
                ): number =>
                    left.startOffset - right.startOffset ||
                    left.endOffset - right.endOffset,
            );

            merged.push(...this.mergeNeighbors(group));
        }

        merged.sort(
            (
                left: ResearchContextFragment,
                right: ResearchContextFragment,
            ): number =>
                right.score - left.score ||
                left.articleId - right.articleId ||
                left.startOffset - right.startOffset,
        );

        return merged.slice(0, this.maxFragments);
    }

    private mergeNeighbors(
        fragments: ResearchContextFragment[],
    ): ResearchContextFragment[] {
        const result: ResearchContextFragment[] = [];
        let current: ResearchContextFragment | null = null;

        for (const fragment of fragments) {
            if (current === null) {
                current = { ...fragment };
                continue;
            }

            if (fragment.startOffset > current.endOffset) {
                result.push(current);
                current = { ...fragment };
                continue;
            }

            const currentCharacters: string[] =
                Array.from(current.text);

            const nextCharacters: string[] =
                Array.from(fragment.text);

            const overlapEnd: number = Math.min(
                current.endOffset,
                fragment.endOffset,
            );

            const overlapLength: number =
                overlapEnd - fragment.startOffset;

            const currentOverlap: string = currentCharacters
                .slice(
                    fragment.startOffset - current.startOffset,
                    overlapEnd - current.startOffset,
                )
                .join('');

            const nextOverlap: string = nextCharacters
                .slice(0, overlapLength)
                .join('');

            if (currentOverlap !== nextOverlap) {
                throw new Error(
                    'Перекрывающиеся чанки содержат разные тексты.',
                );
            }

            if (fragment.endOffset > current.endOffset) {
                const remainingText: string = nextCharacters
                    .slice(current.endOffset - fragment.startOffset)
                    .join('');

                current.text += remainingText;
                current.endOffset = fragment.endOffset;
            }

            current.score = Math.max(
                current.score,
                fragment.score,
            );
        }

        if (current !== null) {
            result.push(current);
        }

        return result;
    }
}