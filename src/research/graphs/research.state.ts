import { Annotation } from '@langchain/langgraph';

import type { NewsChunkSearchResult } from '../../vector-store/qdrant/interfaces/news-chunk-search-result';
import type { ResearchContextFragment } from '../types/research-context-fragment';
import type { ResearchAnswer } from '../types/research-answer';

// LangGraph выводит тип состояния из этой схемы.
export const ResearchState = Annotation.Root({
    question: Annotation<string>(),
    chunks: Annotation<NewsChunkSearchResult[]>(),
    context: Annotation<ResearchContextFragment[]>(),
    result: Annotation<ResearchAnswer | null>(),
});

export type ResearchGraphState = typeof ResearchState.State;