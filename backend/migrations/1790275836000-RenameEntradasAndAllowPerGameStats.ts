import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameEntradasAndAllowPerGameStats1790275836000 implements MigrationInterface {
  name = 'RenameEntradasAndAllowPerGameStats1790275836000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'estadisticas_jugadores' AND column_name = 'entradas'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'estadisticas_jugadores' AND column_name = 'faltas_cometidas'
        ) THEN
          ALTER TABLE estadisticas_jugadores RENAME COLUMN entradas TO faltas_cometidas;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE estadisticas_jugadores
        ALTER COLUMN tiros TYPE double precision USING tiros::double precision,
        ALTER COLUMN pases_clave TYPE double precision USING pases_clave::double precision,
        ALTER COLUMN regates TYPE double precision USING regates::double precision,
        ALTER COLUMN faltas_cometidas TYPE double precision USING faltas_cometidas::double precision;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE estadisticas_jugadores
        ALTER COLUMN tiros TYPE integer USING ROUND(tiros)::integer,
        ALTER COLUMN pases_clave TYPE integer USING ROUND(pases_clave)::integer,
        ALTER COLUMN regates TYPE integer USING ROUND(regates)::integer,
        ALTER COLUMN faltas_cometidas TYPE integer USING ROUND(faltas_cometidas)::integer;
    `);
    await queryRunner.query(
      'ALTER TABLE estadisticas_jugadores RENAME COLUMN faltas_cometidas TO entradas',
    );
  }
}
