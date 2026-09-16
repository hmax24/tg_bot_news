import {Injectable} from "@nestjs/common";
import {NewsTopic} from "./news-topic.entity";
import {InjectRepository} from "@nestjs/typeorm";
import {EntityManager, In, Repository} from "typeorm";

@Injectable()
export class NewsTopicsRepository {
    constructor(
        @InjectRepository(NewsTopic)
        private readonly repository: Repository<NewsTopic>,
    ) {}

    async addTopic(
        names: string[],
        manager?: EntityManager,
    ): Promise<void> {
        if (names.length === 0) {
            return;
        }

        const repository: Repository<NewsTopic> = manager
            ? manager.getRepository(NewsTopic)
            : this.repository;

        await repository
            .createQueryBuilder()
            .insert()
            .into(NewsTopic)
            .values(names.map((name: string): { name: string } => ({name})))
            .orIgnore()
            .execute();
    }

    async findByNames(
        names: string[],
        manager?: EntityManager,
    ): Promise<NewsTopic[]> {
        if (names.length === 0) {
            return [];
        }

        const repository: Repository<NewsTopic> = manager
            ? manager.getRepository(NewsTopic)
            : this.repository;

        return repository.find({
            where: {
                name: In(names),
            }
        });
    }

    async findActiveById(
        id: number,
        manager: EntityManager,
    ): Promise<NewsTopic | null> {
        const repository: Repository<NewsTopic> =
            manager.getRepository(NewsTopic);

        return repository.findOneBy({
            id,
            isActive: true,
        });
    }

    async findAllActive(): Promise<NewsTopic[]> {
        return this.repository.find({
            where: {
                isActive: true,
            },
            order: {
                name: 'ASC',
            },
        });
    }
}