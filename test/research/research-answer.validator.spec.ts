import { ResearchAnswerValidator } from '../../src/research/validation/research-answer.validator';

describe('ResearchAnswerValidator', (): void => {
    it('accepts repeated citations and trims the answer', (): void => {
        expect(ResearchAnswerValidator.parse(JSON.stringify({ answer: ' Факт [1]. Ещё факт [1][2]. ', sourceArticleIds: [1, 2] }), [1, 2]))
            .toEqual({ answer: 'Факт [1]. Ещё факт [1][2].', sourceArticleIds: [1, 2] });
    });

    it('accepts the explicit insufficient-data response', (): void => {
        const answer: string = 'В проиндексированном архиве недостаточно данных для ответа.';
        expect(ResearchAnswerValidator.parse(JSON.stringify({ answer, sourceArticleIds: [] }), [1])).toEqual({ answer, sourceArticleIds: [] });
    });

    it.each(['not JSON', '```json\n{}\n```', 'null', '[]', '{}', '{"answer":"x","sourceArticleIds":[],"extra":true}'])('rejects malformed response %s', (raw: string): void => {
        expect((): unknown => ResearchAnswerValidator.parse(raw, [1])).toThrow();
    });

    it.each([null, '', '   ', 'a'.repeat(3001)])('rejects invalid answer %#', (answer: unknown): void => {
        expect((): unknown => ResearchAnswerValidator.parse(JSON.stringify({ answer, sourceArticleIds: [] }), [1])).toThrow();
    });

    it.each([null, ['1'], [0], [-1], [1.5], [Number.MAX_SAFE_INTEGER + 1], [1, 1], [2]])('rejects invalid or disallowed sources %#', (sourceArticleIds: unknown): void => {
        expect((): unknown => ResearchAnswerValidator.parse(JSON.stringify({ answer: 'Факт [1]', sourceArticleIds }), [1])).toThrow();
    });

    it.each([
        { answer: 'Факт [2]', sourceArticleIds: [1] },
        { answer: 'Факт [1]', sourceArticleIds: [1, 2] },
        { answer: 'Неподтверждённый факт', sourceArticleIds: [] },
    ])('rejects missing or unused citations %#', (response: { answer: string; sourceArticleIds: number[] }): void => {
        expect((): unknown => ResearchAnswerValidator.parse(JSON.stringify(response), [1, 2])).toThrow();
    });
});
