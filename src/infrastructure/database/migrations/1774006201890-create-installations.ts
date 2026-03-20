import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateInstallations1774006201890 implements MigrationInterface {
  name = 'CreateInstallations1774006201890';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'installations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'github_installation_id', type: 'bigint', isUnique: true },
          { name: 'github_account_login', type: 'varchar' },
          { name: 'github_account_type', type: 'varchar' },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'llm_provider', type: 'varchar', isNullable: true },
          { name: 'llm_api_key_encrypted', type: 'text', isNullable: true },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'installations',
      new TableForeignKey({
        name: 'fk_installations_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'installations',
      'fk_installations_user_id',
    );
    await queryRunner.dropTable('installations');
  }
}
