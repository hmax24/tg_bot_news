import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

import { TelegramUsersService } from '../telegram-user/telegram-users.service';
import { NewsBroadcastRepository } from './news-broadcast.repository';
import {NewsBroadcastRecipientsRepository} from "./news-broadcast-recipients.repository";
import {NewsBroadcastRecipientDto} from "./dto/news-broadcast-recipient.dto";

@Injectable()
export class NewsBroadcastService {
    constructor(
        private readonly repository: NewsBroadcastRepository,
        private readonly telegramUsersService: TelegramUsersService,
        private readonly recipientsRepository: NewsBroadcastRecipientsRepository,
    ) {}

    async createForArticle(
        articleId: number,
        manager: EntityManager,
    ): Promise<void> {
        const maxRecipientUserId: number =
            await this.telegramUsersService.getMaxId(manager);

        await this.repository.createPending(
            articleId,
            maxRecipientUserId,
            manager,
        );
    }

    private readonly recipientsBatchSize: number = 100;

    async getRecipientsBatch(
        articleId: number,
        afterUserId: number,
        maxRecipientUserId: number,
    ): Promise<NewsBroadcastRecipientDto[]> {
        if (afterUserId >= maxRecipientUserId) {
            return [];
        }

        return this.recipientsRepository.findBatch(
            articleId,
            afterUserId,
            maxRecipientUserId,
            this.recipientsBatchSize,
        );
    }

    async isEligibleRecipient(
        articleId: number,
        userId: number,
    ): Promise<boolean> {
        const recipients: NewsBroadcastRecipientDto[] =
            await this.recipientsRepository.findBatch(
                articleId,
                userId - 1,
                userId,
                1,
            );

        return recipients.length > 0;
    }
}