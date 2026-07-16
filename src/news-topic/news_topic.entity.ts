import {
    Column,
    CreateDateColumn,
    Entity,
    JoinTable,
    ManyToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {NewsSubscription} from "../news-subscription/news-subscription.entity";

@Entity('news-topic')
export class NewsTopic {
    @PrimaryGeneratedColumn({name: 'id'})
    id: number;

    @Column({name: 'name', nullable: false, unique: false})
    name: string;

    @Column({name: 'description', nullable: false, unique: false})
    description: string

    @Column({name: 'isActive', default: true, unique: false})
    isActive: boolean;

    @ManyToMany((): typeof NewsSubscription => NewsSubscription)
    @JoinTable({
        name: 'news-topics_news-subscription',
        joinColumn: {name: 'news-topics_id', referencedColumnName: 'id'},
        inverseJoinColumn: {name: 'news-subscription_id', referencedColumnName: 'id'}
    })
    newsSubscriptions:NewsSubscription[]

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

}