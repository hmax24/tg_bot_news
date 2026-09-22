import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

import { TelegramSendLimiter } from './telegram-send-limiter.service';

@Injectable()
export class TelegramMessageSender {
    constructor(
        @InjectBot()
        private readonly bot: Telegraf,
        private readonly limiter: TelegramSendLimiter,
    ) {}

    async send(
        telegramId: string,
        text: string,
    ): Promise<void> {
        await this.limiter.execute<void>(
            telegramId,
            async (): Promise<void> => {
                await this.bot.telegram.sendMessage(
                    telegramId,
                    text,
                );
            },
        );
    }
}