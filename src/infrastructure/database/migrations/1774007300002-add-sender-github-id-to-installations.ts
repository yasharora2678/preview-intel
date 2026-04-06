import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSenderGithubIdToInstallations1774007300002 implements MigrationInterface {
  name = 'AddSenderGithubIdToInstallations1774007300002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'installations',
      new TableColumn({
        name: 'sender_github_id',
        type: 'bigint',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('installations', 'sender_github_id');
  }
}