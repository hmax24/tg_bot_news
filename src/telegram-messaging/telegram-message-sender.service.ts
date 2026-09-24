import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

import { TelegramSendLimiter } from './telegram-send-limiter.service';
import { TelegramMessageKeyboard } from './keyboards/telegram-message.keyboard';
import { TelegramMessageDto } from './dto/telegram-message.dto';

@Injectable()
export class TelegramMessageSender {
  constructor(
    @InjectBot()
    private readonly bot: Telegraf,
    private readonly limiter: TelegramSendLimiter,
  ) {}

  async send(telegramId: string, message: TelegramMessageDto): Promise<void> {
    await this.limiter.execute<void>(telegramId, async (): Promise<void> => {
      await this.bot.telegram.sendMessage(telegramId, message.text, {
        reply_markup: TelegramMessageKeyboard.create(message.buttons),
      });
    });
  }
}
