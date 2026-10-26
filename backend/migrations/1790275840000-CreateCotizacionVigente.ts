import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCotizacionVigente1790275840000
  implements MigrationInterface
{
  name = 'CreateCotizacionVigente1790275840000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE cotizacion_vigente (
        id_jugador uuid PRIMARY KEY
          REFERENCES jugadores(id) ON DELETE RESTRICT,
        cotizacion numeric(14, 2) NOT NULL CHECK (cotizacion >= 0),
        fecha_hora timestamptz NOT NULL,
        tipo_estrategia varchar(60) NOT NULL
          CHECK (tipo_estrategia IN ('ataque_decisivo', 'creacion_tecnica')),
        id_version_estrategia uuid NOT NULL
          REFERENCES versiones_estrategia_cotizacion(id) ON DELETE RESTRICT,
        id_recalculo uuid NOT NULL
          REFERENCES recalculos_cotizacion(id) ON DELETE RESTRICT,
        id_estadistica uuid NOT NULL
          REFERENCES estadisticas_jugadores(id) ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE cotizacion_vigente');
  }
}
