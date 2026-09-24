import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSourceArticleId1790276944531 implements MigrationInterface {
    name = 'AddSourceArticleId1790276944531'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "news_article" ADD "sourceArticleId" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "news_article" DROP COLUMN "sourceArticleId"`);
    }

}
