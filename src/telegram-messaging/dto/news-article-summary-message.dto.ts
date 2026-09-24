import type { NewsTopicDto } from '../../news-topic/dto/news-topic.dto';

export interface NewsArticleSummaryMessageDto {
    title: string;
    summary: string;
    url: string;
    topics: NewsTopicDto[];
}