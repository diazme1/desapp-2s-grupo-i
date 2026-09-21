import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentidadesExternasJugador1720000001000 implements MigrationInterface {
  name = 'CreateIdentidadesExternasJugador1720000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS identidades_externas_jugador (
        id uuid PRIMARY KEY,
        jugador_id uuid NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
        proveedor varchar(100) NOT NULL,
        external_id varchar(200) NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_identidades_jugador_proveedor_external_id
      ON identidades_externas_jugador (proveedor, external_id)
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_identidades_jugador ON identidades_externas_jugador (jugador_id)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS identidades_externas_jugador');
  }
}
