import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {TelegramUser} from "../telegram-user/telegram-user.entity";

@Entity('news-subscription')
export class NewsSubscription {
    @PrimaryGeneratedColumn({name: 'id'})
    id: number;

    @OneToOne((): typeof TelegramUser => TelegramUser, {nullable: true})
    @JoinColumn({
        name: 'telegram-user'
    })
    telegramUser: TelegramUser;

    @Column({name: 'isActive', nullable: false, unique: false})
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

}