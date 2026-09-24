import type { TelegramUrlButtonDto } from './telegram-url-button.dto';

export interface TelegramMessageDto {
  text: string;
  buttons: TelegramUrlButtonDto[];
}
