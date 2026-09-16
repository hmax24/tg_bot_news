import {Module} from "@nestjs/common";
import {NewsSubscriptionController} from "./news-subscription.controller";
import {TypeOrmModule} from "@nestjs/typeorm";
import {NewsSubscription} from "./news-subscription.entity";
import {NewsSubscriptionService} from "./news-subscription.service";
import {NewsSubscriptionRepository} from "./news-subscription.repository";

@Module({
    controllers:[NewsSubscriptionController],
    imports:[TypeOrmModule.forFeature([NewsSubscription])],
    providers:[NewsSubscriptionService,NewsSubscriptionRepository],
    exports:[]
})
export class NewsSubscriptionsModule{}