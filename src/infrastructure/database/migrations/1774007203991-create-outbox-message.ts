import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOutboxMessage1774007203991 implements MigrationInterface {
  name = 'CreateOutboxMessage1774007203991';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."outbox_message_status_enum" AS ENUM('published', 'pending', 'failed');
    `);

    await queryRunner.createTable(
      new Table({
        name: 'outbox_message',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'event_type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'delivery_id',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'status',
            type: '"public"."outbox_message_status_enum"',
            default: `'pending'`,
            isNullable: false,
          },
          {
            name: 'attempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'published_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'outbox_message',
      new TableIndex({
        name: 'idx_outbox_status_created_at',
        columnNames: ['status', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'outbox_message',
      'idx_outbox_status_created_at',
    );
    await queryRunner.dropTable('outbox_message');
  }
}
