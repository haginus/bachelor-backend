import { MigrationInterface, QueryRunner } from "typeorm";

export class SpecializationCatalog1772033811661 implements MigrationInterface {
  name = 'SpecializationCatalog1772033811661'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`specialization\` ADD \`catalogName\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`specialization\` ADD \`secretaryId\` int NULL`);
    await queryRunner.query(`ALTER TABLE \`specialization\` ADD CONSTRAINT \`FK_6cd17babb2f0d36c11045fe41c5\` FOREIGN KEY (\`secretaryId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`specialization\` DROP FOREIGN KEY \`FK_6cd17babb2f0d36c11045fe41c5\``);
    await queryRunner.query(`ALTER TABLE \`specialization\` DROP COLUMN \`secretaryId\``);
    await queryRunner.query(`ALTER TABLE \`specialization\` DROP COLUMN \`catalogName\``);
  }

}
