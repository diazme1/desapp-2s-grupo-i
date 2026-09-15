import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsuarios1710000000000 implements MigrationInterface {
  name = 'CreateUsuarios1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id uuid PRIMARY KEY,
        correo varchar(254) NOT NULL UNIQUE,
        password_hash text NOT NULL,
        creado_en timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS usuarios');
  }
}
