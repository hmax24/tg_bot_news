import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ConfigureActiveNewsTopics1790115835721
    implements MigrationInterface
{
    name: string = 'ConfigureActiveNewsTopics1790115835721';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const activeTopicNames: string[] = [
            'ai',
            'webdev',
            'programming',
            'api',
            'devops',
            'security',
            'python',
            'opensource',
            'javascript',
            'automation',
            'architecture',
            'machinelearning',
            'llm',
            'seo',
            'node',
            'android',
            'web3',
            'testing',
            'cybersecurity',
            'typescript',
            'backend',
            'devtools',
            'webscraping',
            'aiagents',
            'kubernetes',
            'linux',
            'react',
            'cloud',
            'datascience',
            'postgres',
        ];

        // Выполняется внутри стандартной транзакции миграций.
        // На время переключения блокируем изменения таблицы.
        await queryRunner.query(`
            LOCK TABLE "news-topic"
            IN SHARE ROW EXCLUSIVE MODE
        `);

        // Сохраняем исходную активность для отката.
        await queryRunner.query(`
            CREATE TABLE "news_topic_activity_backup_1790115835721" (
                "topic_id" integer PRIMARY KEY,
                "name" character varying NOT NULL,
                "was_active" boolean NOT NULL
            )
        `);

        await queryRunner.query(`
            INSERT INTO "news_topic_activity_backup_1790115835721"
                ("topic_id", "name", "was_active")
            SELECT "id", "name", "isActive"
            FROM "news-topic"
        `);

        await queryRunner.query(`
            ALTER TABLE "news-topic"
            ALTER COLUMN "isActive" SET DEFAULT false
        `);

        // На локальной или новой БД некоторых выбранных тем может не быть.
        await queryRunner.query(
            `
                INSERT INTO "news-topic" ("name", "isActive")
                SELECT topic_name, true
                FROM unnest($1::text[]) AS selected(topic_name)
                ON CONFLICT ("name") DO NOTHING
            `,
            [activeTopicNames],
        );

        await queryRunner.query(
            `
                UPDATE "news-topic"
                SET
                    "isActive" = ("name" = ANY($1::text[])),
                    "updatedAt" = CURRENT_TIMESTAMP
                WHERE "isActive" IS DISTINCT FROM
                    ("name" = ANY($1::text[]))
            `,
            [activeTopicNames],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            LOCK TABLE "news-topic"
            IN SHARE ROW EXCLUSIVE MODE
        `);

        // Темы, отсутствовавшие до миграции, сохраняем неактивными.
        await queryRunner.query(`
            UPDATE "news-topic" AS topic
            SET
                "isActive" = false,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE topic."isActive" = true
              AND NOT EXISTS (
                  SELECT 1
                  FROM "news_topic_activity_backup_1790115835721" AS backup
                  WHERE backup."topic_id" = topic."id"
                    AND backup."name" = topic."name"
              )
        `);

        await queryRunner.query(`
            UPDATE "news-topic" AS topic
            SET
                "isActive" = backup."was_active",
                "updatedAt" = CURRENT_TIMESTAMP
            FROM "news_topic_activity_backup_1790115835721" AS backup
            WHERE topic."id" = backup."topic_id"
              AND topic."name" = backup."name"
              AND topic."isActive" IS DISTINCT FROM backup."was_active"
        `);

        await queryRunner.query(`
            ALTER TABLE "news-topic"
            ALTER COLUMN "isActive" SET DEFAULT true
        `);

        await queryRunner.query(`
            DROP TABLE "news_topic_activity_backup_1790115835721"
        `);
    }
}