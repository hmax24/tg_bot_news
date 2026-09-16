import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";

@Entity('news-topic')
export class NewsTopic {
    @PrimaryGeneratedColumn({name: 'id'})
    id: number;

    @Column({name: 'name', nullable: false, unique: true})
    name: string;

    @Column({name: 'description', nullable: false, unique: false, default: ''})
    description: string

    @Column({name: 'isActive', default: true, unique: false})
    isActive: boolean;



    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

}