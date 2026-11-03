import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSaldosUsuario1790275840000 implements MigrationInterface {
  name = 'CreateSaldosUsuario1790275840000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saldos_usuario (
        id_usuario uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE RESTRICT,
        creditos_disponibles bigint NOT NULL DEFAULT 0 CHECK (creditos_disponibles >= 0),
        creado_en timestamptz NOT NULL DEFAULT now(),
        actualizado_en timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO saldos_usuario (id_usuario, creditos_disponibles)
      SELECT u.id, 0
      FROM usuarios u
      WHERE NOT EXISTS (
        SELECT 1 FROM saldos_usuario s WHERE s.id_usuario = u.id
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS saldos_usuario');
  }
}
