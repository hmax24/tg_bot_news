import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {NewsTopic} from "../news-topic/news-topic.entity";

@Entity('news-article')
export class NewsArticleEntity {
    @PrimaryGeneratedColumn({name: 'id'})
    id: number;

    @Column({name: 'title', nullable: false, unique: false})
    title: string

    @Column({name: 'description', nullable: false, unique: false})
    description: string

    @Column({name: 'url', nullable: false, unique: true})
    url: string

    @Column({name: 'sourceName', nullable: false, unique: false})
    sourceName: string

    @Column({name: 'publishedAt', nullable: false, unique: false})
    publishedAt: Date

    @Column({name: 'isSent', nullable: false, unique: false})
    isSent: boolean

    @ManyToOne((): typeof NewsTopic => NewsTopic, {nullable: false})
    @JoinColumn({
        name: "news-topic"
    })
    topic: NewsTopic

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}