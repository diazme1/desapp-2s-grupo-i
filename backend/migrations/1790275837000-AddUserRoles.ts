import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoles1790275837000 implements MigrationInterface {
  name = 'AddUserRoles1790275837000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS rol varchar(20) NOT NULL DEFAULT 'usuario'
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'ck_usuarios_rol'
        ) THEN
          ALTER TABLE usuarios
          ADD CONSTRAINT ck_usuarios_rol CHECK (rol IN ('usuario', 'superadmin'));
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS ck_usuarios_rol',
    );
    await queryRunner.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS rol');
  }
}
