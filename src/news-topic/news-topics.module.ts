import {Module} from "@nestjs/common";
import {NewsTopicsController} from "./news-topics.controller";
import {TypeOrmModule} from "@nestjs/typeorm";
import {NewsTopicsRepository} from "./news-topics.repository";
import {NewsTopicsService} from "./news-topics.service";
import {NewsTopic} from "./news-topic.entity";
import {NewsTopicsMapper} from './dto/news-topics.mapper';

@Module({
    controllers: [NewsTopicsController],
    imports: [TypeOrmModule.forFeature([NewsTopic])],
    providers: [NewsTopicsRepository, NewsTopicsService, NewsTopicsMapper],
    exports: [NewsTopicsService, NewsTopicsMapper]
})
export class NewsTopicsModule {
}
