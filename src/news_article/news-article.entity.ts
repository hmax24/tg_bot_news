import {
    Column,
    CreateDateColumn,
    Entity,
    JoinTable,
    ManyToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {NewsTopic} from "../news-topic/news-topic.entity";

@Entity('news_article')
export class NewsArticle {
    @PrimaryGeneratedColumn({name: 'id'})
    id: number;

    @Column({name: 'title', nullable: false, unique: false})
    title: string

    @Column({name: 'description', nullable: true, unique: false})
    description: string

    @Column({name: 'url', nullable: false, unique: true})
    url: string

    @Column({name: 'sourceName', nullable: false, unique: false})
    sourceName: string

    @Column({name: 'publishedAt', nullable: false, unique: false})
    publishedAt: Date

    @Column({name: 'isSent', default: false, unique: false})
    isSent: boolean

    @ManyToMany((): typeof NewsTopic => NewsTopic)
    @JoinTable({
        name: 'news_article_topics',
        joinColumn: {
            name: 'news_article_id',
            referencedColumnName: 'id',
        },
        inverseJoinColumn: {
            name: 'news_topic_id',
            referencedColumnName: 'id',
        },
    })
    topics: NewsTopic[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}