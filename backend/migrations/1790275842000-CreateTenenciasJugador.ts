import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenenciasJugador1790275842000 implements MigrationInterface {
  name = 'CreateTenenciasJugador1790275842000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenencias_jugador (
        id_tenencia uuid PRIMARY KEY,
        id_usuario uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        id_jugador uuid NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT,
        cantidad_tokens integer NOT NULL CHECK (cantidad_tokens BETWEEN 0 AND 100),
        creado_en timestamptz NOT NULL DEFAULT now(),
        actualizado_en timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_tenencias_usuario_jugador UNIQUE (id_usuario, id_jugador)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS tenencias_jugador');
  }
}
