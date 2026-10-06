export interface NewsChunkSearchResult {
    pointId: string;
    articleId: number;
    summaryHash: string;
    index: number;
    text: string;
    startOffset: number;
    endOffset: number;
    score: number;
}