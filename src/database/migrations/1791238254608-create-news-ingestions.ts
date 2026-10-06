import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNewsIngestions1791238254608 implements MigrationInterface {
    name:string = 'CreateNewsIngestions1791238254608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."news_ingestion_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "news_ingestions" ("id" SERIAL NOT NULL, "article_id" integer NOT NULL, "collection_name" character varying(255) NOT NULL, "summary_hash" character varying(64) NOT NULL, "status" "public"."news_ingestion_status" NOT NULL DEFAULT 'PENDING', "chunk_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_d8cbcb08cc31830af5a86b86fd8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e7b943e4f00f0f52e58e1a9d05" ON "news_ingestions"  ("collection_name", "status", "id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7ac4de93eaacbdce9312feae48" ON "news_ingestions"  ("article_id", "collection_name") `);
        await queryRunner.query(`ALTER TABLE "news_ingestions" ADD CONSTRAINT "FK_167d64a020caf52eda39685f25a" FOREIGN KEY ("article_id") REFERENCES "news_article"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "news_ingestions" DROP CONSTRAINT "FK_167d64a020caf52eda39685f25a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7ac4de93eaacbdce9312feae48"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e7b943e4f00f0f52e58e1a9d05"`);
        await queryRunner.query(`DROP TABLE "news_ingestions"`);
        await queryRunner.query(`DROP TYPE "public"."news_ingestion_status"`);
    }

}
