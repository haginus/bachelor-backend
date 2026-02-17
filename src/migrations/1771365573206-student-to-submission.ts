import { MigrationInterface, QueryRunner } from "typeorm";
import { Paper } from "../papers/entities/paper.entity";
import { Submission } from "../grading/entities/submission.entity";

export class StudentToSubmission1771365573206 implements MigrationInterface {
  name = 'StudentToSubmission1771365573206'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`paper\` DROP FOREIGN KEY \`FK_f73f1247307fd847021d2e88dc7\``);
    await queryRunner.query(`DROP INDEX \`REL_f73f1247307fd847021d2e88dc\` ON \`paper\``);
    await queryRunner.query(`ALTER TABLE \`paper\` DROP COLUMN \`submissionId\``);
    await queryRunner.query(`ALTER TABLE \`submission\` ADD \`isSubmitted\` tinyint NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`submission\` ADD \`studentId\` int NULL`);
    await queryRunner.query(`ALTER TABLE \`submission\` ADD UNIQUE INDEX \`IDX_a174d175dc504dce8df5c21701\` (\`studentId\`)`);
    await queryRunner.query(`ALTER TABLE \`submission\` CHANGE \`submittedAt\` \`submittedAt\` datetime NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX \`REL_a174d175dc504dce8df5c21701\` ON \`submission\` (\`studentId\`)`);
    await queryRunner.query(`ALTER TABLE \`submission\` ADD CONSTRAINT \`FK_a174d175dc504dce8df5c217014\` FOREIGN KEY (\`studentId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.manager.deleteAll(Submission);
    const existingPapers = await queryRunner.manager.find(Paper, { relations: { student: true } });
    for (const paper of existingPapers) {
      const submission = queryRunner.manager.create(Submission, {
        isSubmitted: false,
        student: paper.student,
      });
      await queryRunner.manager.save(submission);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`submission\` DROP FOREIGN KEY \`FK_a174d175dc504dce8df5c217014\``);
    await queryRunner.query(`DROP INDEX \`REL_a174d175dc504dce8df5c21701\` ON \`submission\``);
    await queryRunner.query(`ALTER TABLE \`submission\` CHANGE \`submittedAt\` \`submittedAt\` datetime NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`submission\` DROP INDEX \`IDX_a174d175dc504dce8df5c21701\``);
    await queryRunner.query(`ALTER TABLE \`submission\` DROP COLUMN \`studentId\``);
    await queryRunner.query(`ALTER TABLE \`submission\` DROP COLUMN \`isSubmitted\``);
    await queryRunner.query(`ALTER TABLE \`paper\` ADD \`submissionId\` int NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX \`REL_f73f1247307fd847021d2e88dc\` ON \`paper\` (\`submissionId\`)`);
    await queryRunner.query(`ALTER TABLE \`paper\` ADD CONSTRAINT \`FK_f73f1247307fd847021d2e88dc7\` FOREIGN KEY (\`submissionId\`) REFERENCES \`submission\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

}
