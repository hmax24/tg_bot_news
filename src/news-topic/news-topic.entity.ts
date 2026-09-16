import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";

@Entity('news_topic')
export class NewsTopic {
    @PrimaryGeneratedColumn({name: 'id'})
    id: number;

    @Column({name: 'name', nullable: false, unique: false})
    name: string;

    @Column({name: 'description', nullable: false, unique: false})
    description: string

    @Column({name: 'isActive', default: true, unique: false})
    isActive: boolean;



    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

}