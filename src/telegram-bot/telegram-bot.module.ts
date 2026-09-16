import {Module} from "@nestjs/common";
import {TelegramBotService} from "./telegram-bot.service";
import {TelegramBotUpdate} from "./telegram-bot.update";

@Module({
    providers:[TelegramBotService, TelegramBotUpdate]
})
export class TelegramBotModule {
}