import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendHistorialCotizacionForMarketOpening1790275839000
  implements MigrationInterface
{
  name = 'ExtendHistorialCotizacionForMarketOpening1790275839000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE historial_cotizacion
        ALTER COLUMN id_recalculo DROP NOT NULL,
        ALTER COLUMN id_estadistica DROP NOT NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'ck_historial_cotizacion_apertura_procedencia'
        ) THEN
          ALTER TABLE historial_cotizacion
          ADD CONSTRAINT ck_historial_cotizacion_apertura_procedencia CHECK (
            (
              tipo_estrategia = 'apertura_mercado'
              AND cotizacion = 1.00
              AND id_recalculo IS NULL
              AND id_estadistica IS NULL
            )
            OR (
              tipo_estrategia <> 'apertura_mercado'
              AND id_recalculo IS NOT NULL
              AND id_estadistica IS NOT NULL
            )
          );
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_historial_cotizacion_apertura_jugador
      ON historial_cotizacion (id_jugador)
      WHERE tipo_estrategia = 'apertura_mercado'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_historial_cotizacion_apertura_jugador',
    );
    await queryRunner.query(
      'ALTER TABLE historial_cotizacion DROP CONSTRAINT IF EXISTS ck_historial_cotizacion_apertura_procedencia',
    );
    await queryRunner.query(
      "DELETE FROM historial_cotizacion WHERE tipo_estrategia = 'apertura_mercado'",
    );
    await queryRunner.query(`
      ALTER TABLE historial_cotizacion
        ALTER COLUMN id_recalculo SET NOT NULL,
        ALTER COLUMN id_estadistica SET NOT NULL
    `);
  }
}
