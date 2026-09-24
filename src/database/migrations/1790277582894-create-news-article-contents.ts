import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNewsArticleContents1790277582894 implements MigrationInterface {
    name = 'CreateNewsArticleContents1790277582894'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."news_article_content_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "news_article_contents" ("id" SERIAL NOT NULL, "article_id" integer NOT NULL, "full_text" text, "summary" text, "status" "public"."news_article_content_status" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_2dedae8474052b5aaa84289513" UNIQUE ("article_id"), CONSTRAINT "PK_3f458cef410b893762635fee735" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1423837ea83b8efb3312a3caeb" ON "news_article_contents"  ("status", "id") `);
        await queryRunner.query(`ALTER TABLE "news_article_contents" ADD CONSTRAINT "FK_2dedae8474052b5aaa842895131" FOREIGN KEY ("article_id") REFERENCES "news_article"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "news_article_contents" DROP CONSTRAINT "FK_2dedae8474052b5aaa842895131"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1423837ea83b8efb3312a3caeb"`);
        await queryRunner.query(`DROP TABLE "news_article_contents"`);
        await queryRunner.query(`DROP TYPE "public"."news_article_content_status"`);
    }

}
