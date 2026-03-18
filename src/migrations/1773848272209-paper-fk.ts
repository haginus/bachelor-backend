import { MigrationInterface, QueryRunner } from "typeorm";

export class PaperFk1773848272209 implements MigrationInterface {
  name = 'PaperFk1773848272209'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`paper\` ADD CONSTRAINT \`FK_a42a1dc5780fb4a26ab4f9e7752\` FOREIGN KEY (\`studentId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`paper\` DROP FOREIGN KEY \`FK_a42a1dc5780fb4a26ab4f9e7752\``);
  }

}
