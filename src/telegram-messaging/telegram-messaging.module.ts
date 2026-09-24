import { Module } from '@nestjs/common';

import { TelegramMessageSender } from './telegram-message-sender.service';
import { TelegramSendLimiter } from './telegram-send-limiter.service';

@Module({
  providers: [TelegramSendLimiter, TelegramMessageSender],
  exports: [TelegramMessageSender],
})
export class TelegramMessagingModule {}
