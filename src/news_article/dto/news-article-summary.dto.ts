import type { NewsTopicDto } from '../../news-topic/dto/news-topic.dto';

export interface NewsArticleSummaryDto {
    id: number;
    title: string;
    summary: string;
    url: string;
    topics: NewsTopicDto[];
}