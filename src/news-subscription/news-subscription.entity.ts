import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn, JoinTable, ManyToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {TelegramUser} from "../telegram-user/telegram-user.entity";
import {NewsTopic} from "../news-topic/news-topic.entity";

@Entity('news-subscription')
export class NewsSubscription {
    @PrimaryGeneratedColumn({name: 'id'})
    id: number;

    @OneToOne((): typeof TelegramUser => TelegramUser, {nullable: false})
    @JoinColumn({
        name: 'telegram_user_id'
    })
    telegramUser: TelegramUser;

    @ManyToMany((): typeof NewsTopic => NewsTopic)
    @JoinTable({
        name: 'news_subscription_news_topics',
        joinColumn: {
            name: 'news_subscription_id',
            referencedColumnName: 'id'
        },
        inverseJoinColumn: {
            name: 'news_topic_id',
            referencedColumnName: 'id'
        }
    })
    newsTopics: NewsTopic[]

    @Column({name: 'isActive', default: true, unique: false})
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

}