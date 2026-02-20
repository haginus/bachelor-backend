import { MigrationInterface, QueryRunner } from "typeorm";

export class WrittenExamGrade1771438976133 implements MigrationInterface {
  name = 'WrittenExamGrade1771438976133'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_a174d175dc504dce8df5c21701\` ON \`submission\``);
    await queryRunner.query(`CREATE TABLE \`written_exam_grade\` (\`submissionId\` int NOT NULL, \`initialGrade\` int NOT NULL, \`isDisputed\` tinyint NOT NULL DEFAULT 0, \`disputeGrade\` int NULL, PRIMARY KEY (\`submissionId\`)) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`written_exam_grade\` ADD CONSTRAINT \`FK_9fa598026af70a65fce2c436461\` FOREIGN KEY (\`submissionId\`) REFERENCES \`submission\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`written_exam_grade\` DROP FOREIGN KEY \`FK_9fa598026af70a65fce2c436461\``);
    await queryRunner.query(`DROP TABLE \`written_exam_grade\``);
    await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_a174d175dc504dce8df5c21701\` ON \`submission\` (\`studentId\`)`);
  }

}
