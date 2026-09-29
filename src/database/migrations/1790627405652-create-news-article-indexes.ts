import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNewsArticleIndexes1790627405652 implements MigrationInterface {
    name = 'CreateNewsArticleIndexes1790627405652'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."news_indexing_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "news_article_indexes" ("id" SERIAL NOT NULL, "article_id" integer NOT NULL, "collection_name" character varying(255) NOT NULL, "summary_hash" character varying(64) NOT NULL, "status" "public"."news_indexing_status" NOT NULL DEFAULT 'PENDING', "embedding" real array, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_29920153470359078cc51f3b494" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fb7b134e268775b05c12cbcafc" ON "news_article_indexes"  ("collection_name", "status", "id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_680f1abad3630d10692dd8a134" ON "news_article_indexes"  ("article_id", "collection_name") `);
        await queryRunner.query(`ALTER TABLE "news_article_indexes" ADD CONSTRAINT "FK_ac36863664239dd3c0e4466ae63" FOREIGN KEY ("article_id") REFERENCES "news_article"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "news_article_indexes" DROP CONSTRAINT "FK_ac36863664239dd3c0e4466ae63"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_680f1abad3630d10692dd8a134"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fb7b134e268775b05c12cbcafc"`);
        await queryRunner.query(`DROP TABLE "news_article_indexes"`);
        await queryRunner.query(`DROP TYPE "public"."news_indexing_status"`);
    }

}
