import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateRepositories1774006725787 implements MigrationInterface {
  name = 'CreateRepositories1774006725787';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'repositories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'installation_id', type: 'uuid' },
          { name: 'github_repo_id', type: 'bigint', isUnique: true },
          { name: 'full_name', type: 'varchar' },
          { name: 'default_branch', type: 'varchar' },
          { name: 'is_enabled', type: 'boolean', default: true },
          { name: 'skip_drafts', type: 'boolean', default: true },
          { name: 'skip_bots', type: 'boolean', default: true },
          {
            name: 'skip_file_patterns',
            type: 'text',
            isArray: true,
            default: "'{}'",
          },
          { name: 'score_failure_threshold', type: 'int', default: 50 },
          { name: 'score_success_threshold', type: 'int', default: 80 },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'repositories',
      new TableIndex({
        name: 'idx_repositories_github_repo_id',
        columnNames: ['github_repo_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'repositories',
      new TableForeignKey({
        name: 'fk_repositories_installation_id',
        columnNames: ['installation_id'],
        referencedTableName: 'installations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'repositories',
      'fk_repositories_installation_id',
    );
    await queryRunner.dropIndex(
      'repositories',
      'idx_repositories_github_repo_id',
    );
    await queryRunner.dropTable('repositories');
  }
}
