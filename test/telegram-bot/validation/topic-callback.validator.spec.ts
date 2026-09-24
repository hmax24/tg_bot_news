import { TopicCallbackValidator } from '../../../src/telegram-bot/validation/topic-callback.validator';

describe('TopicCallbackValidator', (): void => {
  it.each(['1', '2147483647'])(
    'accepts PostgreSQL ID %s',
    (value: string): void => {
      expect(
        TopicCallbackValidator.parseTopicId(
          'subscribe_topic:' + value,
          'subscribe_topic:',
        ),
      ).toBe(Number(value));
    },
  );

  it.each([
    '0',
    '-1',
    '2147483648',
    '9007199254740991',
    '01',
    '1.5',
    '1e3',
    '',
    'typescript',
    ' 1',
  ])('rejects invalid ID %s', (value: string): void => {
    expect(
      TopicCallbackValidator.parseTopicId(
        'subscribe_topic:' + value,
        'subscribe_topic:',
      ),
    ).toBeNull();
  });

  it('rejects another action prefix', (): void => {
    expect(
      TopicCallbackValidator.parseTopicId(
        'unsubscribe_topic:1',
        'subscribe_topic:',
      ),
    ).toBeNull();
  });
});
