import { MigrationInterface, QueryRunner } from 'typeorm';

export class CurrentQuotesPerStrategy1790275841000
  implements MigrationInterface
{
  name = 'CurrentQuotesPerStrategy1790275841000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE recalculo_cotizacion_activo
        ADD COLUMN tipo_estrategia varchar(60) NULL
    `);
    await queryRunner.query(`
      UPDATE recalculo_cotizacion_activo activo
      SET tipo_estrategia = version.tipo_estrategia
      FROM recalculos_cotizacion recalculo
      JOIN versiones_estrategia_cotizacion version
        ON version.id = recalculo.id_version_estrategia
      WHERE activo.id_recalculo = recalculo.id
    `);
    await queryRunner.query(`
      ALTER TABLE recalculo_cotizacion_activo
        ADD CONSTRAINT ck_recalculo_activo_estrategia
        CHECK (
          (id_recalculo IS NULL AND tipo_estrategia IS NULL)
          OR (id_recalculo IS NOT NULL AND tipo_estrategia IN
            ('ataque_decisivo', 'creacion_tecnica'))
        )
    `);
    await queryRunner.query(`
      ALTER TABLE cotizacion_vigente DROP CONSTRAINT cotizacion_vigente_pkey
    `);
    await queryRunner.query(`
      ALTER TABLE cotizacion_vigente
        ADD CONSTRAINT cotizacion_vigente_pkey
        PRIMARY KEY (id_jugador, tipo_estrategia)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM cotizacion_vigente cotizacion
      WHERE cotizacion.tipo_estrategia <> COALESCE(
        (SELECT tipo_estrategia FROM recalculo_cotizacion_activo WHERE id = 1),
        'ataque_decisivo'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE cotizacion_vigente DROP CONSTRAINT cotizacion_vigente_pkey
    `);
    await queryRunner.query(`
      ALTER TABLE cotizacion_vigente
        ADD CONSTRAINT cotizacion_vigente_pkey PRIMARY KEY (id_jugador)
    `);
    await queryRunner.query(`
      ALTER TABLE recalculo_cotizacion_activo
        DROP CONSTRAINT ck_recalculo_activo_estrategia,
        DROP COLUMN tipo_estrategia
    `);
  }
}
