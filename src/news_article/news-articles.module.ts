import {Module} from "@nestjs/common";
import {NewsArticlesController} from "./news_articles.controller";
import {TypeOrmModule} from "@nestjs/typeorm";
import {NewsArticle} from "./news_article.entity";
import {NewsArticlesService} from "./news_articles.service";
import {NewsArticlesRepository} from "./news_articles.repository";

@Module({
    controllers:[NewsArticlesController],
    imports:[TypeOrmModule.forFeature([NewsArticle])],
    providers:[NewsArticlesService,NewsArticlesRepository],
    exports:[]
})
export class NewsArticlesModule{}