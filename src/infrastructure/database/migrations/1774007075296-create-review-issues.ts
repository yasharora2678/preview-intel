import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateReviewIssues1774007075296 implements MigrationInterface {
  name = 'CreateReviewIssues1774007075296';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'review_issues',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'review_id', type: 'uuid' },
          { name: 'type', type: 'varchar' },
          { name: 'severity', type: 'varchar' },
          { name: 'file_path', type: 'text' },
          { name: 'line_number', type: 'int', isNullable: true },
          { name: 'description', type: 'text' },
          { name: 'suggestion', type: 'text', isNullable: true },
          { name: 'github_comment_id', type: 'bigint', isNullable: true },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'review_issues',
      new TableForeignKey({
        name: 'fk_review_issues_review_id',
        columnNames: ['review_id'],
        referencedTableName: 'reviews',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'review_issues',
      'fk_review_issues_review_id',
    );
    await queryRunner.dropTable('review_issues');
  }
}
