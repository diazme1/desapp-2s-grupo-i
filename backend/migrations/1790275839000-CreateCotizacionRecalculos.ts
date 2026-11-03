import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCotizacionRecalculos1790275839000
  implements MigrationInterface
{
  name = 'CreateCotizacionRecalculos1790275839000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE estadisticas_jugadores
        ADD COLUMN IF NOT EXISTS fecha_captura timestamptz NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_estadisticas_jugadores_captura
      ON estadisticas_jugadores (id_jugador, fecha_captura DESC, id DESC)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS versiones_estrategia_cotizacion (
        id uuid PRIMARY KEY,
        tipo_estrategia varchar(40) NOT NULL
          CHECK (tipo_estrategia IN ('ataque_decisivo', 'creacion_tecnica')),
        numero_version integer NOT NULL CHECK (numero_version > 0),
        pesos jsonb NOT NULL CHECK (jsonb_typeof(pesos) = 'object'),
        creado_en timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tipo_estrategia, numero_version)
      )
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION impedir_cambio_version_estrategia_cotizacion()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Las versiones de estrategia son inmutables.';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_version_estrategia_cotizacion_inmutable
      BEFORE UPDATE OR DELETE ON versiones_estrategia_cotizacion
      FOR EACH ROW EXECUTE FUNCTION impedir_cambio_version_estrategia_cotizacion()
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recalculos_cotizacion (
        id uuid PRIMARY KEY,
        id_version_estrategia uuid NOT NULL
          REFERENCES versiones_estrategia_cotizacion(id) ON DELETE RESTRICT,
        fecha_inicio timestamptz NOT NULL,
        fecha_fin timestamptz NOT NULL,
        jugadores_cotizados integer NOT NULL CHECK (jugadores_cotizados >= 0),
        CHECK (fecha_fin >= fecha_inicio)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recalculo_cotizacion_activo (
        id smallint PRIMARY KEY CHECK (id = 1),
        id_recalculo uuid NULL
          REFERENCES recalculos_cotizacion(id) ON DELETE RESTRICT,
        actualizado_en timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO recalculo_cotizacion_activo (id, id_recalculo)
      VALUES (1, NULL)
      ON CONFLICT (id) DO NOTHING
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION impedir_modificacion_historial_cotizacion()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'El historial de cotizaciones es append-only.';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_historial_cotizacion_append_only
      BEFORE UPDATE OR DELETE ON historial_cotizacion
      FOR EACH ROW EXECUTE FUNCTION impedir_modificacion_historial_cotizacion()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_historial_cotizacion_append_only ON historial_cotizacion',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS impedir_modificacion_historial_cotizacion()',
    );
    await queryRunner.query('DROP TABLE IF EXISTS recalculo_cotizacion_activo');
    await queryRunner.query('DROP TABLE IF EXISTS recalculos_cotizacion');
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_version_estrategia_cotizacion_inmutable ON versiones_estrategia_cotizacion',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS versiones_estrategia_cotizacion',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS impedir_cambio_version_estrategia_cotizacion()',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_estadisticas_jugadores_captura',
    );
    await queryRunner.query(
      'ALTER TABLE estadisticas_jugadores DROP COLUMN IF EXISTS fecha_captura',
    );
  }
}
