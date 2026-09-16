import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramUser } from './telegram-user.entity';
import { TelegramUsersController } from './telegram-users.controller';
import { TelegramUsersRepository } from './telegram-users.repository';
import { TelegramUsersService } from './telegram-users.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([TelegramUser]),
    ],
    controllers: [
        TelegramUsersController,
    ],
    providers: [
        TelegramUsersRepository,
        TelegramUsersService,
    ],
    exports: [
        TelegramUsersService,
    ],
})
export class TelegramUsersModule {}