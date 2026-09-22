import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNewsBroadcasts1790079919926 implements MigrationInterface {
    name: string = 'CreateNewsBroadcasts1790079919926';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."news_broadcast_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED')`);
        await queryRunner.query(`CREATE TABLE "news_broadcasts" ("id" SERIAL NOT NULL, "article_id" integer NOT NULL, "status" "public"."news_broadcast_status" NOT NULL DEFAULT 'PENDING', "max_recipient_user_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "REL_fee653955d8f578405077e9234" UNIQUE ("article_id"), CONSTRAINT "PK_d13c437572eb643f4993895156c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e50ecb5d5b4e876e2cf48d5801" ON "news_broadcasts"  ("status", "id") `);
        await queryRunner.query(`ALTER TABLE "news_broadcasts" ADD CONSTRAINT "FK_fee653955d8f578405077e9234f" FOREIGN KEY ("article_id") REFERENCES "news_article"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "news_broadcasts" DROP CONSTRAINT "FK_fee653955d8f578405077e9234f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e50ecb5d5b4e876e2cf48d5801"`);
        await queryRunner.query(`DROP TABLE "news_broadcasts"`);
        await queryRunner.query(`DROP TYPE "public"."news_broadcast_status"`);
    }

}
