import type {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
} from 'telegraf/types';

import type { TelegramUrlButtonDto } from '../dto/telegram-url-button.dto';

export class TelegramMessageKeyboard {
  static create(buttons: TelegramUrlButtonDto[]): InlineKeyboardMarkup {
    const rows: InlineKeyboardButton[][] = buttons.map(
      (button: TelegramUrlButtonDto): InlineKeyboardButton[] => [
        {
          text: button.text,
          url: button.url,
        },
      ],
    );

    return {
      inline_keyboard: rows,
    };
  }
}
