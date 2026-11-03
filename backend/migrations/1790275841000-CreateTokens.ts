import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTokens1790275841000 implements MigrationInterface {
  name = 'CreateTokens1790275841000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id_token uuid PRIMARY KEY,
        id_jugador uuid NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT,
        id_usuario_owner uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        numero_emision smallint NOT NULL CHECK (numero_emision BETWEEN 1 AND 100),
        id_lote_emision uuid NOT NULL,
        emitido_en timestamptz NOT NULL DEFAULT now(),
        actualizado_en timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_tokens_jugador_numero_emision UNIQUE (id_jugador, numero_emision)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tokens_jugador_owner
      ON tokens (id_jugador, id_usuario_owner)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS tokens');
  }
}
