import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEstadisticasJugadores1790275835000 implements MigrationInterface {
  name = 'CreateEstadisticasJugadores1790275835000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS estadisticas_jugadores (
        id uuid PRIMARY KEY,
        id_jugador uuid NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT,
        goles integer NULL CHECK (goles IS NULL OR goles >= 0),
        asistencias integer NULL CHECK (asistencias IS NULL OR asistencias >= 0),
        tiros integer NULL CHECK (tiros IS NULL OR tiros >= 0),
        pases_clave integer NULL CHECK (pases_clave IS NULL OR pases_clave >= 0),
        regates integer NULL CHECK (regates IS NULL OR regates >= 0),
        entradas integer NULL CHECK (entradas IS NULL OR entradas >= 0),
        rating_whoscored double precision NULL CHECK (rating_whoscored IS NULL OR rating_whoscored >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_estadisticas_jugadores_id_jugador ON estadisticas_jugadores (id_jugador)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS estadisticas_jugadores');
  }
}
