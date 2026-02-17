import { MigrationInterface, QueryRunner } from "typeorm";

export class DomainWrittenExam1771168288724 implements MigrationInterface {
    name = 'DomainWrittenExam1771168288724'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`domain\` ADD \`hasWrittenExam\` tinyint NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`domain\` DROP COLUMN \`hasWrittenExam\``);
    }

}
