import { Annotation } from '@langchain/langgraph';

import type { NewsArticleSummaryDto } from '../../news_article/dto/news-article-summary.dto';

// Тип выводится из схемы LangGraph, чтобы сохранить типизацию узлов.
export const SimilarNewsState = Annotation.Root({
    articleId: Annotation<number>(),
    collectionName: Annotation<string>(),
    indexed: Annotation<boolean>(),
    candidateIds: Annotation<number[]>(),
    articles: Annotation<NewsArticleSummaryDto[]>(),
});

export type SimilarNewsGraphState =
    typeof SimilarNewsState.State;