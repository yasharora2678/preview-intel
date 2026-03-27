import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateReviews1774006970457 implements MigrationInterface {
  name = 'CreateReviews1774006970457';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'reviews',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'pull_request_id', type: 'uuid' },
          { name: 'head_commit_sha', type: 'varchar' },
          { name: 'status', type: 'varchar' },
          { name: 'llm_provider', type: 'varchar', isNullable: true },
          { name: 'llm_model', type: 'varchar', isNullable: true },
          { name: 'score', type: 'int', isNullable: true },
          { name: 'summary', type: 'text', isNullable: true },
          { name: 'missing_tests', type: 'boolean', default: false },
          { name: 'breaking_change', type: 'boolean', default: false },
          { name: 'github_review_id', type: 'bigint', isNullable: true },
          { name: 'processing_started_at', type: 'timestamptz', isNullable: true },
          { name: 'processing_completed_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'reviews',
      new TableIndex({
        name: 'idx_reviews_pull_request_id',
        columnNames: ['pull_request_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'reviews',
      new TableForeignKey({
        name: 'fk_reviews_pull_request_id',
        columnNames: ['pull_request_id'],
        referencedTableName: 'pull_requests',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('reviews', 'idx_reviews_pull_request_id');
    await queryRunner.dropForeignKey('reviews', 'fk_reviews_pull_request_id');
    await queryRunner.dropTable('reviews');
  }
}
