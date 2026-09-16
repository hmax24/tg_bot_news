import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789516800000 implements MigrationInterface {
    name: string = 'InitialSchema1789516800000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE \"news-topic\" (\"id\" SERIAL NOT NULL, \"name\" character varying NOT NULL, \"description\" character varying NOT NULL DEFAULT '', \"isActive\" boolean NOT NULL DEFAULT true, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_b203a57db3e5520136f0e5c0b75\" UNIQUE (\"name\"), CONSTRAINT \"PK_b1703a4a44dd75a60a7003a7eb7\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"news_article\" (\"id\" SERIAL NOT NULL, \"title\" character varying NOT NULL, \"description\" character varying, \"url\" character varying NOT NULL, \"sourceName\" character varying NOT NULL, \"publishedAt\" TIMESTAMP NOT NULL, \"isSent\" boolean NOT NULL DEFAULT false, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_c8124b9d4eefd9efeb340dd1b6a\" UNIQUE (\"url\"), CONSTRAINT \"PK_12e2ec4b5482dadc50ee88e0da1\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"telegram_users\" (\"id\" SERIAL NOT NULL, \"telegramId\" character varying NOT NULL, \"username\" character varying, \"firstName\" character varying, \"isActive\" boolean NOT NULL DEFAULT true, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_86a2f3085db8f1a992ac696f8d9\" UNIQUE (\"telegramId\"), CONSTRAINT \"PK_dcba80e97f84ad7f9bc8f19f472\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"news-subscription\" (\"id\" SERIAL NOT NULL, \"isActive\" boolean NOT NULL DEFAULT true, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now(), \"telegram_user_id\" integer NOT NULL, CONSTRAINT \"REL_6b041093e6f8103f9c77c12d25\" UNIQUE (\"telegram_user_id\"), CONSTRAINT \"PK_40f7ee017b869aee0a03f9112ab\" PRIMARY KEY (\"id\"))");
        await queryRunner.query("CREATE TABLE \"news_article_topics\" (\"news_article_id\" integer NOT NULL, \"news_topic_id\" integer NOT NULL, CONSTRAINT \"PK_d744224dabad99b5219e98c5d90\" PRIMARY KEY (\"news_article_id\", \"news_topic_id\"))");
        await queryRunner.query("CREATE INDEX \"IDX_9c9dcdab6c27f11d53b17af653\" ON \"news_article_topics\"  (\"news_article_id\") ");
        await queryRunner.query("CREATE INDEX \"IDX_66f8f4ee5c41c84898fe7b610b\" ON \"news_article_topics\"  (\"news_topic_id\") ");
        await queryRunner.query("CREATE TABLE \"news_subscription_news_topics\" (\"news_subscription_id\" integer NOT NULL, \"news_topic_id\" integer NOT NULL, CONSTRAINT \"PK_9a45c16757fb28b4ded1a7c6dc7\" PRIMARY KEY (\"news_subscription_id\", \"news_topic_id\"))");
        await queryRunner.query("CREATE INDEX \"IDX_4518fc7fdf5787217550e6c2f6\" ON \"news_subscription_news_topics\"  (\"news_subscription_id\") ");
        await queryRunner.query("CREATE INDEX \"IDX_5dfbd3d5f6aff43ad10d24b271\" ON \"news_subscription_news_topics\"  (\"news_topic_id\") ");
        await queryRunner.query("ALTER TABLE \"news-subscription\" ADD CONSTRAINT \"FK_6b041093e6f8103f9c77c12d255\" FOREIGN KEY (\"telegram_user_id\") REFERENCES \"telegram_users\"(\"id\") ON DELETE NO ACTION ON UPDATE NO ACTION");
        await queryRunner.query("ALTER TABLE \"news_article_topics\" ADD CONSTRAINT \"FK_9c9dcdab6c27f11d53b17af653d\" FOREIGN KEY (\"news_article_id\") REFERENCES \"news_article\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"news_article_topics\" ADD CONSTRAINT \"FK_66f8f4ee5c41c84898fe7b610b6\" FOREIGN KEY (\"news_topic_id\") REFERENCES \"news-topic\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"news_subscription_news_topics\" ADD CONSTRAINT \"FK_4518fc7fdf5787217550e6c2f62\" FOREIGN KEY (\"news_subscription_id\") REFERENCES \"news-subscription\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
        await queryRunner.query("ALTER TABLE \"news_subscription_news_topics\" ADD CONSTRAINT \"FK_5dfbd3d5f6aff43ad10d24b2711\" FOREIGN KEY (\"news_topic_id\") REFERENCES \"news-topic\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE \"news_subscription_news_topics\" DROP CONSTRAINT \"FK_5dfbd3d5f6aff43ad10d24b2711\"");
        await queryRunner.query("ALTER TABLE \"news_subscription_news_topics\" DROP CONSTRAINT \"FK_4518fc7fdf5787217550e6c2f62\"");
        await queryRunner.query("ALTER TABLE \"news_article_topics\" DROP CONSTRAINT \"FK_66f8f4ee5c41c84898fe7b610b6\"");
        await queryRunner.query("ALTER TABLE \"news_article_topics\" DROP CONSTRAINT \"FK_9c9dcdab6c27f11d53b17af653d\"");
        await queryRunner.query("ALTER TABLE \"news-subscription\" DROP CONSTRAINT \"FK_6b041093e6f8103f9c77c12d255\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_5dfbd3d5f6aff43ad10d24b271\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_4518fc7fdf5787217550e6c2f6\"");
        await queryRunner.query("DROP TABLE \"news_subscription_news_topics\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_66f8f4ee5c41c84898fe7b610b\"");
        await queryRunner.query("DROP INDEX \"public\".\"IDX_9c9dcdab6c27f11d53b17af653\"");
        await queryRunner.query("DROP TABLE \"news_article_topics\"");
        await queryRunner.query("DROP TABLE \"news-subscription\"");
        await queryRunner.query("DROP TABLE \"telegram_users\"");
        await queryRunner.query("DROP TABLE \"news_article\"");
        await queryRunner.query("DROP TABLE \"news-topic\"");
    }
}
