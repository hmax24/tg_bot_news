import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { END, START, StateGraph } from '@langchain/langgraph';
import { DataSource } from 'typeorm';

import { NewsArticlesMapper } from '../../news_article/dto/news-articles.mapper';
import type { NewsArticleSummaryDto } from '../../news_article/dto/news-article-summary.dto';
import type { NewsArticleContent } from '../../news-article-content/news-article-content.entity';
import { QdrantStorageClient } from '../../vector-store/qdrant/qdrant.client';
import type { SimilarNewsPoint } from '../../vector-store/qdrant/interfaces/similar-news-point.interface';
import { NewsSearchRepository } from '../news-search.repository';
import {
    SimilarNewsState,
    type SimilarNewsGraphState,
} from './similar-news.state';

@Injectable()
export class SimilarNewsGraph {
    private readonly graph: ReturnType<
        SimilarNewsGraph['buildGraph']
    >;

    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        private readonly repository: NewsSearchRepository,
        private readonly qdrantClient: QdrantStorageClient,
        private readonly articlesMapper: NewsArticlesMapper,
    ) {
        this.graph = this.buildGraph();
    }

    async search(
        articleId: number,
    ): Promise<SimilarNewsGraphState> {
        if (
            !Number.isSafeInteger(articleId) ||
            articleId <= 0
        ) {
            throw new Error('Некорректный ID статьи для поиска.');
        }

        const collectionName: string = this.configService
            .getOrThrow<string>('QDRANT_COLLECTION')
            .trim();

        if (
            collectionName.length > 255 ||
            !/^[a-zA-Z0-9_-]+$/.test(collectionName)
        ) {
            throw new Error('Некорректное название коллекции.');
        }

        return this.graph.invoke({
            articleId,
            collectionName,
            indexed: false,
            candidateIds: [],
            articles: [],
        });
    }

    // Возвращаемый тип выводится из цепочки:
    // LangGraph включает имена узлов в тип графа.
    private buildGraph() {
        return new StateGraph(SimilarNewsState)
            .addNode(
                'checkIndex',
                (
                    state: SimilarNewsGraphState,
                ): Promise<Partial<SimilarNewsGraphState>> =>
                    this.checkIndex(state),
            )
            .addNode(
                'findNeighbors',
                (
                    state: SimilarNewsGraphState,
                ): Promise<Partial<SimilarNewsGraphState>> =>
                    this.findNeighbors(state),
            )
            .addNode(
                'loadArticles',
                (
                    state: SimilarNewsGraphState,
                ): Promise<Partial<SimilarNewsGraphState>> =>
                    this.loadArticles(state),
            )
            .addEdge(START, 'checkIndex')
            .addConditionalEdges(
                'checkIndex',
                (
                    state: SimilarNewsGraphState,
                ): 'findNeighbors' | typeof END =>
                    state.indexed ? 'findNeighbors' : END,
                {
                    findNeighbors: 'findNeighbors',
                    [END]: END,
                },
            )
            .addEdge('findNeighbors', 'loadArticles')
            .addEdge('loadArticles', END)
            .compile();
    }

    private async checkIndex(
        state: SimilarNewsGraphState,
    ): Promise<Partial<SimilarNewsGraphState>> {
        const indexed: boolean = await this.repository.isIndexed(
            state.articleId,
            state.collectionName,
            this.dataSource.manager,
        );

        return { indexed };
    }

    private async findNeighbors(
        state: SimilarNewsGraphState,
    ): Promise<Partial<SimilarNewsGraphState>> {
        const points: SimilarNewsPoint[] =
            await this.qdrantClient.findSimilarNews(
                state.collectionName,
                state.articleId,
                3,
            );

        const candidateIds: number[] = points.map(
            (point: SimilarNewsPoint): number => point.articleId,
        );

        return { candidateIds };
    }

    private async loadArticles(
        state: SimilarNewsGraphState,
    ): Promise<Partial<SimilarNewsGraphState>> {
        const contents: NewsArticleContent[] =
            await this.repository.findCompletedContents(
                state.candidateIds,
                this.dataSource.manager,
            );

        const articles: NewsArticleSummaryDto[] = contents.map(
            (content: NewsArticleContent): NewsArticleSummaryDto =>
                this.articlesMapper.mapToSummaryDto(content),
        );

        return { articles };
    }
}