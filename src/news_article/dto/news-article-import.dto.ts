export interface NewsArticleImportDto {
    title: string;
    description: string;
    url: string;
    sourceName: string;
    publishedAt: Date;
    topicNames: string[];
}