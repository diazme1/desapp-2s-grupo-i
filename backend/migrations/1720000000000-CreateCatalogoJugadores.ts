import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogoJugadores1720000000000 implements MigrationInterface {
  name = 'CreateCatalogoJugadores1720000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ligas (
        id uuid PRIMARY KEY,
        codigo varchar(100) NOT NULL UNIQUE,
        nombre varchar(100) NOT NULL UNIQUE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipos (
        id uuid PRIMARY KEY,
        liga_id uuid NOT NULL REFERENCES ligas(id),
        nombre varchar(150) NOT NULL,
        CONSTRAINT uq_equipos_id_liga UNIQUE (id, liga_id)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_equipos_liga_nombre_ci
      ON equipos (liga_id, lower(nombre))
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS jugadores (
        id uuid PRIMARY KEY,
        liga_id uuid NOT NULL REFERENCES ligas(id),
        equipo_id uuid NOT NULL REFERENCES equipos(id),
        nombre varchar(200) NOT NULL,
        posicion varchar(100) NOT NULL,
        activo boolean NOT NULL DEFAULT true,
        actualizado_en timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_jugadores_equipo_liga UNIQUE (id, liga_id),
        CONSTRAINT fk_jugadores_equipo_liga
          FOREIGN KEY (equipo_id, liga_id) REFERENCES equipos(id, liga_id)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_jugadores_activo ON jugadores (activo)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_jugadores_liga ON jugadores (liga_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_jugadores_equipo ON jugadores (equipo_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_jugadores_posicion ON jugadores (lower(posicion))',
    );

    await queryRunner.query(`
      INSERT INTO ligas (id, codigo, nombre) VALUES
        ('10000000-0000-4000-8000-000000000001', 'premier-league', 'Premier League'),
        ('10000000-0000-4000-8000-000000000002', 'bundesliga', 'Bundesliga'),
        ('10000000-0000-4000-8000-000000000003', 'la-liga', 'La Liga'),
        ('10000000-0000-4000-8000-000000000004', 'serie-a', 'Serie A'),
        ('10000000-0000-4000-8000-000000000005', 'ligue-1', 'Ligue 1')
      ON CONFLICT DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO equipos (id, liga_id, nombre) VALUES
        ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Arsenal'),
        ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Bayern Munich'),
        ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Real Madrid'),
        ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'Inter'),
        ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 'Paris Saint-Germain')
      ON CONFLICT DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO jugadores (id, liga_id, equipo_id, nombre, posicion, activo, actualizado_en) VALUES
        ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Bukayo Saka', 'extremo', true, now()),
        ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Harry Kane', 'delantero', true, now()),
        ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Vinicius Junior', 'extremo', true, now()),
        ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', 'Lautaro Martinez', 'delantero', true, now()),
        ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', 'Kylian Mbappe', 'delantero', true, now())
      ON CONFLICT DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS jugadores');
    await queryRunner.query('DROP TABLE IF EXISTS equipos');
    await queryRunner.query('DROP TABLE IF EXISTS ligas');
  }
}
