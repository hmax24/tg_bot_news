export interface NewsChunkPoint {
    pointId: string;
    articleId: number;
    summaryHash: string;
    index: number;
    text: string;
    startOffset: number;
    endOffset: number;
    embedding: number[];
}