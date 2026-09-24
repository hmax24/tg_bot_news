export interface NewsArticleImportDto {
  title: string;
  description: string;
  url: string;
  sourceName: string;
  sourceArticleId: number;
  publishedAt: Date;
  topicNames: string[];
}
