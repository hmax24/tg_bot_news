import { Injectable } from '@nestjs/common';
import { END, START, StateGraph } from '@langchain/langgraph';

import { ResearchRetrievalService } from '../research-retrieval.service';
import { ContextService } from '../context.service';
import { ResearchAnswerService } from '../research-answer.service';
import type { ResearchAnswer } from '../types/research-answer';
import type { ResearchContextFragment } from '../types/research-context-fragment';
import type { NewsChunkSearchResult } from '../../vector-store/qdrant/interfaces/news-chunk-search-result';
import {
    ResearchState,
    type ResearchGraphState,
} from './research.state';

@Injectable()
export class ResearchGraph {
    private readonly graph: ReturnType<
        ResearchGraph['buildGraph']
    >;

    constructor(
        private readonly retrievalService: ResearchRetrievalService,
        private readonly contextService: ContextService,
        private readonly answerService: ResearchAnswerService,
    ) {
        this.graph = this.buildGraph();
    }

    async research(question: string): Promise<ResearchAnswer> {
        const normalizedQuestion: string = question.trim();

        if (
            normalizedQuestion.length === 0 ||
            Array.from(normalizedQuestion).length > 2000
        ) {
            throw new Error(
                'Вопрос должен содержать от 1 до 2000 символов.',
            );
        }

        const state: ResearchGraphState = await this.graph.invoke({
            question: normalizedQuestion,
            chunks: [],
            context: [],
            result: null,
        });

        if (state.result === null) {
            throw new Error(
                'Граф исследования завершился без результата.',
            );
        }

        return state.result;
    }

    // Тип результата выводится из цепочки построения:
    // он включает конкретные имена узлов графа.
    private buildGraph() {
        return new StateGraph(ResearchState)
            .addNode(
                'retrieve',
                (
                    state: ResearchGraphState,
                ): Promise<Partial<ResearchGraphState>> =>
                    this.retrieve(state),
            )
            .addNode(
                'buildContext',
                (
                    state: ResearchGraphState,
                ): Partial<ResearchGraphState> =>
                    this.buildContext(state),
            )
            .addNode(
                'generateAnswer',
                (
                    state: ResearchGraphState,
                ): Promise<Partial<ResearchGraphState>> =>
                    this.generateAnswer(state),
            )
            .addEdge(START, 'retrieve')
            .addEdge('retrieve', 'buildContext')
            .addEdge('buildContext', 'generateAnswer')
            .addEdge('generateAnswer', END)
            .compile();
    }

    private async retrieve(
        state: ResearchGraphState,
    ): Promise<Partial<ResearchGraphState>> {
        const chunks: NewsChunkSearchResult[] =
            await this.retrievalService.search(state.question);

        return { chunks };
    }

    private buildContext(
        state: ResearchGraphState,
    ): Partial<ResearchGraphState> {
        const context: ResearchContextFragment[] =
            this.contextService.generateContext(state.chunks);

        return { context };
    }

    private async generateAnswer(
        state: ResearchGraphState,
    ): Promise<Partial<ResearchGraphState>> {
        const result: ResearchAnswer =
            await this.answerService.generate(
                state.question,
                state.context,
            );

        return { result };
    }
}