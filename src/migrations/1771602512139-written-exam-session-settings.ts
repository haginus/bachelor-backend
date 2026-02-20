import { MigrationInterface, QueryRunner } from "typeorm";

export class WrittenExamSessionSettings1771602512139 implements MigrationInterface {
  name = 'WrittenExamSessionSettings1771602512139'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`session_settings\` CHANGE \`allowGrading\` \`allowPaperGrading\` tinyint NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`session_settings\` ADD \`writtenExamDate\` datetime NULL`);
    await queryRunner.query(`ALTER TABLE \`session_settings\` ADD \`writtenExamDisputeEndDate\` datetime NULL`);
    await queryRunner.query(`ALTER TABLE \`session_settings\` ADD \`writtenExamGradesPublic\` tinyint NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE \`session_settings\` ADD \`writtenExamDisputedGradesPublic\` tinyint NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`session_settings\` DROP COLUMN \`writtenExamDisputedGradesPublic\``);
    await queryRunner.query(`ALTER TABLE \`session_settings\` DROP COLUMN \`writtenExamGradesPublic\``);
    await queryRunner.query(`ALTER TABLE \`session_settings\` DROP COLUMN \`writtenExamDisputeEndDate\``);
    await queryRunner.query(`ALTER TABLE \`session_settings\` DROP COLUMN \`writtenExamDate\``);
    await queryRunner.query(`ALTER TABLE \`session_settings\` CHANGE \`allowPaperGrading\` \`allowGrading\` tinyint NOT NULL`);
  }

}
