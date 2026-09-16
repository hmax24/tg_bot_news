export const BOT_BUTTONS = {
    TOPICS: '📰 Темы новостей',
    MY_SUBSCRIPTIONS: '⭐ Мои подписки',
    UNSUBSCRIBE: '❌ Отписаться',
    HELP: 'ℹ️ Помощь',
} as const;

export const CALLBACK_PREFIXES = {
    SUBSCRIBE_TOPIC: 'subscribe_topic:',
    UNSUBSCRIBE_TOPIC: 'unsubscribe_topic:',
} as const;

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
        command: 'latest',
        description: 'Последние новости',
    },
    {
        command: 'help',
        description: 'Помощь',
    },
];

export const DEFAULT_TOPICS: string[] = [
    'Backend',
    'Frontend',
    'JavaScript',
    'TypeScript',
    'NestJS',
    'React',
    'AI',
    'DevOps',
    'Cybersecurity',
];