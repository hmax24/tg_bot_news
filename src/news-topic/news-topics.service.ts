import {Injectable} from "@nestjs/common";
import {NewsTopicsRepository} from "./news-topics.repository";
import {NewsTopic} from "./news-topic.entity";
import {EntityManager} from "typeorm";
import type {NewsTopicDto} from './dto/news-topic.dto';
import {NewsTopicsMapper} from './dto/news-topics.mapper';

@Injectable()
export class NewsTopicsService {
    constructor(
        private readonly repository: NewsTopicsRepository,
        private readonly mapper: NewsTopicsMapper,
    ) {
    }

    async getOrCreateByNames(
        names: string[],
        manager?: EntityManager,
    ): Promise<NewsTopic[]> {
        const normalizedNames: string[] = [];

        for (
            let index: number = 0;
            index < names.length;
            index++
        ) {
            const name: string = names[index];
            const normalizedName: string = name.trim().toLowerCase();

            if (
                normalizedName.length > 0 &&
                !normalizedNames.includes(normalizedName)
            ) {
                normalizedNames.push(normalizedName);
            }
        }

        normalizedNames.sort();


        if (normalizedNames.length === 0) {
            return [];
        }

        await this.repository.addTopic(
            normalizedNames,
            manager,
        );

        return this.repository.findByNames(
            normalizedNames,
            manager,
        );
    }

    async getActiveById(
        id: number,
        manager: EntityManager,
    ): Promise<NewsTopic> {
        const topic: NewsTopic | null =
            await this.repository.findActiveById(id, manager);

        if (topic === null) {
            throw new Error('Тема не найдена или недоступна');
        }

        return topic;
    }

    async getAllActive(): Promise<NewsTopicDto[]> {
        const topics: NewsTopic[] = await this.repository.findAllActive();
        return this.mapper.mapToDtoList(topics);
    }

}
