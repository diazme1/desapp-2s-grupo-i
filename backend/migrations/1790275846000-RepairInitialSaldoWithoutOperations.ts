import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairInitialSaldoWithoutOperations1790275846000 implements MigrationInterface {
  name = 'RepairInitialSaldoWithoutOperations1790275846000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE saldos_usuario saldo
      SET creditos_disponibles = 100000,
          actualizado_en = now()
      FROM usuarios usuario
      WHERE usuario.id = saldo.id_usuario
        AND usuario.rol = 'usuario'
        AND saldo.creditos_disponibles = 0
        AND NOT EXISTS (
          SELECT 1
          FROM transacciones_mercado operacion
          WHERE (operacion.tipo = 'COMPRA' AND operacion.id_usuario_comprador = usuario.id)
             OR (operacion.tipo = 'VENTA' AND operacion.id_usuario_vendedor = usuario.id)
        )
    `);
  }

  async down(): Promise<void> {
    // No se revierten créditos que pueden haberse usado desde la acreditación.
  }
}
