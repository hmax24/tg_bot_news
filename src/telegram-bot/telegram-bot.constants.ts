export const BOT_BUTTONS = {
  TOPICS: '📰 Темы новостей',
  MY_SUBSCRIPTIONS: '⭐ Мои подписки',
  UNSUBSCRIBE: '❌ Отписаться',
  HELP: 'ℹ️ Помощь',
  RESEARCH: '🔎 Исследовать тему',
} as const;

export const CALLBACK_PREFIXES = {
  SUBSCRIBE_TOPIC: 'subscribe_topic:',
  UNSUBSCRIBE_TOPIC: 'unsubscribe_topic:',
} as const;

export const RESEARCH_QUESTION_PROMPT: string =
    'Какую тему исследовать? Напиши вопрос в ответ на это сообщение.';

export const BOT_COMMANDS = [
  {
    command: 'start',
    description: 'Запустить бота',
  },
  {
    command: 'topics',
    description: 'Показать темы новостей',
  },
  {
    command: 'my_subscriptions',
    description: 'Мои подписки',
  },
  {
    command: 'unsubscribe',
    description: 'Отписаться от темы',
  },
  {
    command: 'research',
    description: 'Исследовать тему по архиву',
  },
  {
    command: 'latest',
    description: 'Последние новости',
  },
  {
    command: 'help',
    description: 'Помощь',
  },
];
