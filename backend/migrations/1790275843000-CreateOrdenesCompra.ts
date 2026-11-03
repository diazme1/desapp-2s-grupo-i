import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdenesCompra1790275843000 implements MigrationInterface {
  name = 'CreateOrdenesCompra1790275843000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ordenes_compra (
        id_operacion uuid PRIMARY KEY,
        clave_idempotencia varchar(128) NOT NULL,
        id_usuario_comprador uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        id_usuario_vendedor uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        id_jugador uuid NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT,
        cantidad_tokens integer NOT NULL
          CONSTRAINT ck_ordenes_compra_cantidad_tokens CHECK (cantidad_tokens > 0),
        cotizacion numeric(14, 2) NOT NULL
          CONSTRAINT ck_ordenes_compra_cotizacion CHECK (cotizacion >= 0),
        importe_creditos bigint NOT NULL
          CONSTRAINT ck_ordenes_compra_importe_creditos CHECK (importe_creditos >= 0),
        tipo_estrategia varchar(60) NOT NULL
          CONSTRAINT ck_ordenes_compra_tipo_estrategia
          CHECK (tipo_estrategia IN ('ataque_decisivo', 'creacion_tecnica')),
        id_version_estrategia uuid NOT NULL
          REFERENCES versiones_estrategia_cotizacion(id) ON DELETE RESTRICT,
        id_recalculo uuid NOT NULL
          REFERENCES recalculos_cotizacion(id) ON DELETE RESTRICT,
        fecha_hora timestamptz NOT NULL,
        creado_en timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ordenes_compra_clave_idempotencia UNIQUE (clave_idempotencia),
        CONSTRAINT ck_ordenes_compra_clave_idempotencia
          CHECK (clave_idempotencia ~ '^[A-Za-z0-9._~\\-]{1,128}$')
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ordenes_compra_jugador_fecha
      ON ordenes_compra (id_jugador, fecha_hora DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ordenes_compra_comprador_fecha
      ON ordenes_compra (id_usuario_comprador, fecha_hora DESC)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auditorias_orden_compra (
        id_auditoria uuid PRIMARY KEY,
        id_operacion uuid NOT NULL UNIQUE
          REFERENCES ordenes_compra(id_operacion) ON DELETE RESTRICT,
        id_usuario_comprador uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        id_usuario_vendedor uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        id_jugador uuid NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT,
        cantidad_tokens integer NOT NULL
          CONSTRAINT ck_auditorias_orden_compra_cantidad_tokens CHECK (cantidad_tokens > 0),
        cotizacion numeric(14, 2) NOT NULL
          CONSTRAINT ck_auditorias_orden_compra_cotizacion CHECK (cotizacion >= 0),
        importe_creditos bigint NOT NULL
          CONSTRAINT ck_auditorias_orden_compra_importe_creditos CHECK (importe_creditos >= 0),
        tipo_estrategia varchar(60) NOT NULL
          CONSTRAINT ck_auditorias_orden_compra_tipo_estrategia
          CHECK (tipo_estrategia IN ('ataque_decisivo', 'creacion_tecnica')),
        id_version_estrategia uuid NOT NULL
          REFERENCES versiones_estrategia_cotizacion(id) ON DELETE RESTRICT,
        fecha_hora timestamptz NOT NULL,
        clave_idempotencia varchar(128) NOT NULL,
        CONSTRAINT ck_auditorias_orden_compra_clave
          CHECK (clave_idempotencia ~ '^[A-Za-z0-9._~\\-]{1,128}$')
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_auditorias_orden_compra_fecha
      ON auditorias_orden_compra (fecha_hora DESC)
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION impedir_modificacion_orden_compra()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Las órdenes de compra son inmutables.';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_orden_compra_inmutable ON ordenes_compra',
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_orden_compra_inmutable
      BEFORE UPDATE OR DELETE ON ordenes_compra
      FOR EACH ROW EXECUTE FUNCTION impedir_modificacion_orden_compra()
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION impedir_modificacion_auditoria_orden_compra()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Las auditorías de órdenes de compra son append-only.';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_auditoria_orden_compra_append_only ON auditorias_orden_compra',
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_auditoria_orden_compra_append_only
      BEFORE UPDATE OR DELETE ON auditorias_orden_compra
      FOR EACH ROW EXECUTE FUNCTION impedir_modificacion_auditoria_orden_compra()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_auditoria_orden_compra_append_only ON auditorias_orden_compra',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS impedir_modificacion_auditoria_orden_compra()',
    );
    await queryRunner.query('DROP TABLE IF EXISTS auditorias_orden_compra');
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_orden_compra_inmutable ON ordenes_compra',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS impedir_modificacion_orden_compra()',
    );
    await queryRunner.query('DROP TABLE IF EXISTS ordenes_compra');
  }
}
