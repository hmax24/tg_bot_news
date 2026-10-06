import type { NewsSummaryChunk } from './news-summary-chunk';

export interface PreparedNewsChunk extends NewsSummaryChunk {
    pointId: string;
    summaryHash: string;
}