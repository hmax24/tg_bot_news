import type { TelegramButtonDto } from './telegram-button.dto';

export interface TelegramMessageDto {
  text: string;
  buttons: TelegramButtonDto[];
}