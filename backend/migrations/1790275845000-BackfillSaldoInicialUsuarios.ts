import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillSaldoInicialUsuarios1790275845000 implements MigrationInterface {
  name = 'BackfillSaldoInicialUsuarios1790275845000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO saldos_usuario (
        id_usuario,
        creditos_disponibles,
        creado_en,
        actualizado_en
      )
      SELECT usuario.id,
             100000,
             usuario.creado_en,
             now()
      FROM usuarios usuario
      WHERE usuario.rol = 'usuario'
        AND NOT EXISTS (
          SELECT 1
          FROM saldos_usuario saldo
          WHERE saldo.id_usuario = usuario.id
        )
      ON CONFLICT (id_usuario) DO NOTHING
    `);
  }

  async down(): Promise<void> {
    // No se revierten créditos que pueden haberse usado desde la acreditación.
  }
}
