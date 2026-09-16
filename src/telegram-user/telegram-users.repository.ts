import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { TelegramUser } from './telegram-user.entity';

@Injectable()
export class TelegramUsersRepository {
    constructor(
        @InjectRepository(TelegramUser)
        private readonly repository: Repository<TelegramUser>,
    ) {}

    async addUser(
        telegramId: string,
        manager?: EntityManager,
    ): Promise<void> {
        const repository: Repository<TelegramUser> =
            this.getRepository(manager);

        await repository
            .createQueryBuilder()
            .insert()
            .into(TelegramUser)
            .values({ telegramId })
            .orIgnore()
            .execute();
    }

    async findByTelegramId(
        telegramId: string,
        manager?: EntityManager,
    ): Promise<TelegramUser | null> {
        const repository: Repository<TelegramUser> =
            this.getRepository(manager);

        return repository.findOneBy({ telegramId });
    }

    private getRepository(
        manager?: EntityManager,
    ): Repository<TelegramUser> {
        return manager
            ? manager.getRepository(TelegramUser)
            : this.repository;
    }
}