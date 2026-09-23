import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramUser } from './telegram-user.entity';
import { TelegramUsersRepository } from './telegram-users.repository';
import { TelegramUsersService } from './telegram-users.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([TelegramUser]),
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