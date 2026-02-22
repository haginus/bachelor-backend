import { MigrationInterface, QueryRunner } from "typeorm";

export class SubmissionLogs1771716198472 implements MigrationInterface {
  name = 'SubmissionLogs1771716198472'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`log\` ADD \`submissionId\` int NULL`);
    await queryRunner.query(`ALTER TABLE \`log\` ADD CONSTRAINT \`FK_63cbb421a5bffb99f493730b830\` FOREIGN KEY (\`submissionId\`) REFERENCES \`submission\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`log\` DROP FOREIGN KEY \`FK_63cbb421a5bffb99f493730b830\``);
    await queryRunner.query(`ALTER TABLE \`log\` DROP COLUMN \`submissionId\``);
  }

}
