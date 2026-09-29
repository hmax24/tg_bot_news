import type {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
} from 'telegraf/types';

import type { TelegramButtonDto } from '../dto/telegram-button.dto';

export class TelegramMessageKeyboard {
  static create(
      buttons: TelegramButtonDto[],
  ): InlineKeyboardMarkup {
    const rows: InlineKeyboardButton[][] = buttons.map(
        (button: TelegramButtonDto): InlineKeyboardButton[] => {
          if ('url' in button) {
            return [{
              text: button.text,
              url: button.url,
            }];
          }

          return [{
            text: button.text,
            callback_data: button.callbackData,
          }];
        },
    );

    return {
      inline_keyboard: rows,
    };
  }
}