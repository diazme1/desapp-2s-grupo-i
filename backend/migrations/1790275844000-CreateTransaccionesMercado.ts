import { MigrationInterface, QueryRunner } from 'typeorm';
import { CreateOrdenesCompra1790275843000 } from './1790275843000-CreateOrdenesCompra';

export class CreateTransaccionesMercado1790275844000 implements MigrationInterface {
  name = 'CreateTransaccionesMercado1790275844000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transacciones_mercado (
        id_operacion uuid PRIMARY KEY,
        tipo varchar(10) NOT NULL
          CONSTRAINT ck_transacciones_mercado_tipo CHECK (tipo IN ('COMPRA', 'VENTA')),
        clave_idempotencia varchar(128) NOT NULL,
        id_usuario_comprador uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        id_usuario_vendedor uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        id_jugador uuid NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT,
        cantidad_tokens integer NOT NULL
          CONSTRAINT ck_transacciones_mercado_cantidad_tokens CHECK (cantidad_tokens > 0),
        cotizacion numeric(14, 2) NOT NULL
          CONSTRAINT ck_transacciones_mercado_cotizacion CHECK (cotizacion >= 0),
        importe_creditos bigint NOT NULL
          CONSTRAINT ck_transacciones_mercado_importe_creditos CHECK (importe_creditos >= 0),
        tipo_estrategia varchar(60) NOT NULL
          CONSTRAINT ck_transacciones_mercado_tipo_estrategia
          CHECK (tipo_estrategia IN ('ataque_decisivo', 'creacion_tecnica')),
        id_version_estrategia uuid NOT NULL
          REFERENCES versiones_estrategia_cotizacion(id) ON DELETE RESTRICT,
        id_recalculo uuid NOT NULL
          REFERENCES recalculos_cotizacion(id) ON DELETE RESTRICT,
        fecha_hora timestamptz NOT NULL,
        creado_en timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_transacciones_mercado_clave_idempotencia UNIQUE (clave_idempotencia),
        CONSTRAINT ck_transacciones_mercado_clave_idempotencia
          CHECK (clave_idempotencia ~ '^[A-Za-z0-9._~\\-]{1,128}$')
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transacciones_mercado_jugador_fecha
      ON transacciones_mercado (id_jugador, fecha_hora DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transacciones_mercado_comprador_fecha
      ON transacciones_mercado (id_usuario_comprador, fecha_hora DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transacciones_mercado_vendedor_fecha
      ON transacciones_mercado (id_usuario_vendedor, fecha_hora DESC)
    `);

    await queryRunner.query(`
      INSERT INTO transacciones_mercado (
        id_operacion, tipo, clave_idempotencia, id_usuario_comprador,
        id_usuario_vendedor, id_jugador, cantidad_tokens, cotizacion,
        importe_creditos, tipo_estrategia, id_version_estrategia, id_recalculo,
        fecha_hora, creado_en
      )
      SELECT id_operacion, 'COMPRA', clave_idempotencia, id_usuario_comprador,
        id_usuario_vendedor, id_jugador, cantidad_tokens, cotizacion,
        importe_creditos, tipo_estrategia, id_version_estrategia, id_recalculo,
        fecha_hora, creado_en
      FROM ordenes_compra
      ON CONFLICT (id_operacion) DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auditorias_transaccion (
        id_auditoria uuid PRIMARY KEY,
        id_operacion uuid NOT NULL UNIQUE
          REFERENCES transacciones_mercado(id_operacion) ON DELETE RESTRICT,
        tipo varchar(10) NOT NULL
          CONSTRAINT ck_auditorias_transaccion_tipo CHECK (tipo IN ('COMPRA', 'VENTA')),
        id_usuario_comprador uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        id_usuario_vendedor uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        id_jugador uuid NOT NULL REFERENCES jugadores(id) ON DELETE RESTRICT,
        cantidad_tokens integer NOT NULL
          CONSTRAINT ck_auditorias_transaccion_cantidad_tokens CHECK (cantidad_tokens > 0),
        cotizacion numeric(14, 2) NOT NULL
          CONSTRAINT ck_auditorias_transaccion_cotizacion CHECK (cotizacion >= 0),
        importe_creditos bigint NOT NULL
          CONSTRAINT ck_auditorias_transaccion_importe_creditos CHECK (importe_creditos >= 0),
        tipo_estrategia varchar(60) NOT NULL
          CONSTRAINT ck_auditorias_transaccion_tipo_estrategia
          CHECK (tipo_estrategia IN ('ataque_decisivo', 'creacion_tecnica')),
        id_version_estrategia uuid NOT NULL
          REFERENCES versiones_estrategia_cotizacion(id) ON DELETE RESTRICT,
        id_recalculo uuid NOT NULL
          REFERENCES recalculos_cotizacion(id) ON DELETE RESTRICT,
        fecha_hora timestamptz NOT NULL,
        clave_idempotencia varchar(128) NOT NULL,
        CONSTRAINT ck_auditorias_transaccion_clave
          CHECK (clave_idempotencia ~ '^[A-Za-z0-9._~\\-]{1,128}$')
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_auditorias_transaccion_fecha
      ON auditorias_transaccion (fecha_hora DESC)
    `);
    await queryRunner.query(`
      INSERT INTO auditorias_transaccion (
        id_auditoria, id_operacion, tipo, id_usuario_comprador,
        id_usuario_vendedor, id_jugador, cantidad_tokens, cotizacion,
        importe_creditos, tipo_estrategia, id_version_estrategia, id_recalculo,
        fecha_hora, clave_idempotencia
      )
      SELECT a.id_auditoria, a.id_operacion, 'COMPRA', a.id_usuario_comprador,
        a.id_usuario_vendedor, a.id_jugador, a.cantidad_tokens, a.cotizacion,
        a.importe_creditos, a.tipo_estrategia, a.id_version_estrategia,
        o.id_recalculo, a.fecha_hora, a.clave_idempotencia
      FROM auditorias_orden_compra a
      INNER JOIN ordenes_compra o ON o.id_operacion = a.id_operacion
      ON CONFLICT (id_auditoria) DO NOTHING
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION impedir_modificacion_transaccion_mercado()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Las transacciones de mercado son inmutables.';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_transaccion_mercado_inmutable ON transacciones_mercado',
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_transaccion_mercado_inmutable
      BEFORE UPDATE OR DELETE ON transacciones_mercado
      FOR EACH ROW EXECUTE FUNCTION impedir_modificacion_transaccion_mercado()
    `);
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_auditoria_transaccion_append_only ON auditorias_transaccion',
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_auditoria_transaccion_append_only
      BEFORE UPDATE OR DELETE ON auditorias_transaccion
      FOR EACH ROW EXECUTE FUNCTION impedir_modificacion_transaccion_mercado()
    `);

    await queryRunner.query(`
      DO $$
      DECLARE constraint_record record;
      BEGIN
        FOR constraint_record IN
          SELECT c.conname
          FROM pg_constraint c
          INNER JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'saldos_usuario'
            AND c.contype = 'c'
            AND pg_get_constraintdef(c.oid) ILIKE '%creditos_disponibles%'
        LOOP
          EXECUTE format('ALTER TABLE saldos_usuario DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        END LOOP;
      END $$;
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validar_saldo_usuario_por_rol()
      RETURNS trigger AS $$
      DECLARE rol_usuario varchar(20);
      BEGIN
        IF NEW.creditos_disponibles < 0 THEN
          SELECT rol INTO rol_usuario FROM usuarios WHERE id = NEW.id_usuario;
          IF rol_usuario IS DISTINCT FROM 'superadmin' THEN
            RAISE EXCEPTION 'Un usuario común no puede tener saldo negativo.'
              USING ERRCODE = '23514';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_saldos_usuario_rol_integridad ON saldos_usuario',
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_saldos_usuario_rol_integridad
      BEFORE INSERT OR UPDATE OF creditos_disponibles ON saldos_usuario
      FOR EACH ROW EXECUTE FUNCTION validar_saldo_usuario_por_rol()
    `);

    await queryRunner.query('DROP TABLE IF EXISTS auditorias_orden_compra');
    await queryRunner.query('DROP TABLE IF EXISTS ordenes_compra');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const ventas = (await queryRunner.query(
      `SELECT count(*)::int AS count FROM transacciones_mercado WHERE tipo = 'VENTA'`,
    )) as Array<{ count: number }>;
    if ((ventas[0]?.count ?? 0) > 0)
      throw new Error(
        'No se puede revertir la migración con ventas persistidas.',
      );

    await new CreateOrdenesCompra1790275843000().up(queryRunner);
    await queryRunner.query(`
      INSERT INTO ordenes_compra
      SELECT id_operacion, clave_idempotencia, id_usuario_comprador,
        id_usuario_vendedor, id_jugador, cantidad_tokens, cotizacion,
        importe_creditos, tipo_estrategia, id_version_estrategia, id_recalculo,
        fecha_hora, creado_en
      FROM transacciones_mercado WHERE tipo = 'COMPRA'
      ON CONFLICT (id_operacion) DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO auditorias_orden_compra
      SELECT id_auditoria, id_operacion, id_usuario_comprador,
        id_usuario_vendedor, id_jugador, cantidad_tokens, cotizacion,
        importe_creditos, tipo_estrategia, id_version_estrategia,
        fecha_hora, clave_idempotencia
      FROM auditorias_transaccion
      WHERE tipo = 'COMPRA'
      ON CONFLICT (id_auditoria) DO NOTHING
    `);
    await queryRunner.query(
      'ALTER TABLE saldos_usuario ADD CONSTRAINT ck_saldos_usuario_creditos CHECK (creditos_disponibles >= 0)',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_saldos_usuario_rol_integridad ON saldos_usuario',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS validar_saldo_usuario_por_rol()',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_auditoria_transaccion_append_only ON auditorias_transaccion',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_transaccion_mercado_inmutable ON transacciones_mercado',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS impedir_modificacion_transaccion_mercado()',
    );
    await queryRunner.query('DROP TABLE IF EXISTS auditorias_transaccion');
    await queryRunner.query('DROP TABLE IF EXISTS transacciones_mercado');
  }
}
