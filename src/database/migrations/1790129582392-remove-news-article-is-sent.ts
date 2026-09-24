import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveNewsArticleIsSent1790129582392 implements MigrationInterface {
  name = 'RemoveNewsArticleIsSent1790129582392';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "news_article" DROP COLUMN "isSent"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "news_article" ADD "isSent" boolean NOT NULL DEFAULT false`,
    );
  }
}
