import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { TelegramUser } from './telegram-user.entity';
import { TelegramUsersRepository } from './telegram-users.repository';

@Injectable()
export class TelegramUsersService {
  constructor(private readonly repository: TelegramUsersRepository) {}

  async findByTelegramId(
    telegramId: string,
    manager?: EntityManager,
  ): Promise<TelegramUser | null> {
    return this.repository.findByTelegramId(telegramId, manager);
  }

  async getOrCreateByTelegramId(
    telegramId: string,
    manager?: EntityManager,
  ): Promise<TelegramUser> {
    await this.repository.addUser(telegramId, manager);

    const user: TelegramUser | null = await this.repository.findByTelegramId(
      telegramId,
      manager,
    );

    if (user === null) {
      throw new Error('Telegram user was not found after creation');
    }

    return user;
  }

  async getMaxId(manager: EntityManager): Promise<number> {
    return this.repository.findMaxId(manager);
  }
}
