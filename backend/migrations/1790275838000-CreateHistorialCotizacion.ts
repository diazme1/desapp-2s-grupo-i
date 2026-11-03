import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHistorialCotizacion1790275838000 implements MigrationInterface {
  name = 'CreateHistorialCotizacion1790275838000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS historial_cotizacion (
        id uuid PRIMARY KEY,
        id_jugador uuid NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT,
        fecha_hora timestamptz NOT NULL,
        cotizacion numeric(14, 2) NOT NULL CHECK (cotizacion >= 0),
        tipo_estrategia varchar(60) NOT NULL,
        id_version_estrategia uuid NOT NULL,
        id_recalculo uuid NOT NULL,
        id_estadistica uuid NOT NULL REFERENCES estadisticas_jugadores(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_historial_cotizacion_jugador_fecha_id
      ON historial_cotizacion (id_jugador, fecha_hora DESC, id DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_historial_cotizacion_recalculo
      ON historial_cotizacion (id_recalculo)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS historial_cotizacion');
  }
}
