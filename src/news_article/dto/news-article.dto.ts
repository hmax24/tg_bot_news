import type { NewsTopicDto } from '../../news-topic/dto/news-topic.dto';

export interface NewsArticleDto {
    id: number;
    title: string;
    description: string;
    url: string;
    topics: NewsTopicDto[];
}