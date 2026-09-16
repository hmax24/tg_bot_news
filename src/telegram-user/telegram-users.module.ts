import {Module} from "@nestjs/common";
import {TelegramUsersController} from "./telegram-users.controller";
import {TypeOrmModule} from "@nestjs/typeorm";
import {TelegramUser} from "./telegram-user.entity";
import {TelegramUsersService} from "./telegram-users.service";
import {TelegramUsersRepository} from "./telegram-users.repository";

@Module({
    controllers:[TelegramUsersController],
    imports:[TypeOrmModule.forFeature([TelegramUser])],
    providers:[TelegramUsersService, TelegramUsersRepository],
    exports:[]
})
export class TelegramUsersModule{}