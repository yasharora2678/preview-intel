import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePullRequests1774006916242 implements MigrationInterface {
  name = 'CreatePullRequests1774006916242';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pull_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'repository_id', type: 'uuid' },
          { name: 'github_pr_number', type: 'int' },
          { name: 'title', type: 'text' },
          { name: 'author_login', type: 'varchar' },
          { name: 'head_commit_sha', type: 'varchar' },
          { name: 'base_branch', type: 'varchar' },
          { name: 'head_branch', type: 'varchar' },
          { name: 'github_pr_url', type: 'text' },
          { name: 'state', type: 'varchar' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'pull_requests',
      new TableIndex({
        name: 'idx_pr_repo_id_pr_number',
        columnNames: ['repository_id', 'github_pr_number'],
      }),
    );

    await queryRunner.createForeignKey(
      'pull_requests',
      new TableForeignKey({
        name: 'fk_pull_requests_repository_id',
        columnNames: ['repository_id'],
        referencedTableName: 'repositories',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'pull_requests',
      'fk_pull_requests_repository_id',
    );
    await queryRunner.dropIndex('pull_requests' , 'idx_pr_repo_id_pr_number');
    await queryRunner.dropTable('pull_requests');
  }
}
