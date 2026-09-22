import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';

import { NewsBroadcast } from './news-broadcast.entity';
import { NewsBroadcastStatus } from './enums/news-broadcast-status.enum';
import {InjectRepository} from "@nestjs/typeorm";

@Injectable()
export class NewsBroadcastRepository {
    constructor(
        @InjectRepository(NewsBroadcast)
        private readonly repository: Repository<NewsBroadcast>,
    ) {}

    async createPending(
        articleId: number,
        maxRecipientUserId: number,
        manager: EntityManager,
    ): Promise<void> {
        const repository: Repository<NewsBroadcast> =
            manager.getRepository(NewsBroadcast);

        await repository.insert({
            articleId,
            maxRecipientUserId,
            status: NewsBroadcastStatus.PENDING,
        });
    }

    async findNextPending(): Promise<NewsBroadcast | null> {
        return this.repository.findOne({
            where: {
                status: NewsBroadcastStatus.PENDING,
            },
            relations: {
                article: true,
            },
            order: {
                id: 'ASC',
            },
        });
    }

    async markProcessing(id: number): Promise<void> {
        await this.repository.update(id, {
            status: NewsBroadcastStatus.PROCESSING,
        });
    }

    async markCompleted(id: number): Promise<void> {
        await this.repository.update(id, {
            status: NewsBroadcastStatus.COMPLETED,
            completedAt: new Date(),
        });
    }
}