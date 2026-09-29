import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogoJugadores1727000000000 implements MigrationInterface {
  name = 'CreateCatalogoJugadores1727000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ligas (
        id uuid PRIMARY KEY,
        proveedor_id integer NOT NULL UNIQUE,
        codigo varchar(20) NOT NULL UNIQUE,
        nombre varchar(150) NOT NULL,
        pais varchar(100),
        emblema_url text,
        creado_en timestamptz NOT NULL DEFAULT now(),
        actualizado_en timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipos (
        id uuid PRIMARY KEY,
        proveedor_id integer NOT NULL UNIQUE,
        liga_id uuid NOT NULL REFERENCES ligas(id) ON DELETE RESTRICT,
        nombre varchar(150) NOT NULL,
        nombre_corto varchar(100),
        sigla varchar(10),
        escudo_url text,
        creado_en timestamptz NOT NULL DEFAULT now(),
        actualizado_en timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS jugadores (
        id uuid PRIMARY KEY,
        proveedor_id integer NOT NULL UNIQUE,
        equipo_id uuid NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
        nombre varchar(150) NOT NULL,
        nombre_completo varchar(200),
        posicion varchar(80),
        fecha_nacimiento date,
        nacionalidad varchar(100),
        creado_en timestamptz NOT NULL DEFAULT now(),
        actualizado_en timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_equipos_liga_id ON equipos (liga_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_jugadores_equipo_id ON jugadores (equipo_id)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS jugadores');
    await queryRunner.query('DROP TABLE IF EXISTS equipos');
    await queryRunner.query('DROP TABLE IF EXISTS ligas');
  }
}
