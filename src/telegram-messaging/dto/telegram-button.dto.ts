import type { TelegramUrlButtonDto } from './telegram-url-button.dto';
import type { TelegramCallbackButtonDto } from './telegram-callback-button.dto';

export type TelegramButtonDto =
    | TelegramUrlButtonDto
    | TelegramCallbackButtonDto;