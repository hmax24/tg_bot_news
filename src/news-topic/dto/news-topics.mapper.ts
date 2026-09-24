import { Injectable } from '@nestjs/common';
import type { NewsTopic } from '../news-topic.entity';
import type { NewsTopicDto } from './news-topic.dto';

@Injectable()
export class NewsTopicsMapper {
  mapToDto(topic: NewsTopic): NewsTopicDto {
    return { id: topic.id, name: topic.name };
  }

  mapToDtoList(topics: NewsTopic[]): NewsTopicDto[] {
    return topics.map((topic: NewsTopic): NewsTopicDto => this.mapToDto(topic));
  }
}
