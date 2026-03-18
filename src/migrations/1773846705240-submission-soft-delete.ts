import { MigrationInterface, QueryRunner } from "typeorm";

export class SubmissionSoftDelete1773846705240 implements MigrationInterface {
  name = 'SubmissionSoftDelete1773846705240'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX \`IDX_a174d175dc504dce8df5c21701\` ON \`submission\` (\`studentId\`)`);
    await queryRunner.query(`DROP INDEX \`REL_a174d175dc504dce8df5c21701\` ON \`submission\``);
    await queryRunner.query(`ALTER TABLE \`submission\` ADD \`deletedAt\` datetime(6) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNIQUE INDEX \`REL_a174d175dc504dce8df5c21701\` ON \`submission\` (\`studentId\`)`);
    await queryRunner.query(`DROP INDEX \`IDX_a174d175dc504dce8df5c21701\` ON \`submission\``);
    await queryRunner.query(`ALTER TABLE \`submission\` DROP COLUMN \`deletedAt\``);
  }

}
