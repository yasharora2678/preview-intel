import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsers1774006152366 implements MigrationInterface {
  name = 'CreateUsers1774006152366';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          { name: 'github_id', type: 'bigint', isUnique: true },
          { name: 'github_username', type: 'varchar' },
          { name: 'github_avatar_url', type: 'text', isNullable: true },
          { name: 'is_admin', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
