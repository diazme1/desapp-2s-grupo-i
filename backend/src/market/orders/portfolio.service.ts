import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { Creditos } from '../domain/creditos';
import { PLAYERS_DATA_SOURCE } from '../../players/players.module';

interface PortfolioPositionRow {
  idJugador: string;
  nombre: string;
  equipo: string;
  liga: string;
  cantidadTokens: number;
  cotizacion: string | null;
  fechaCotizacion: Date | null;
}

interface TradeRow {
  idOperacion: string;
  tipo: 'compra' | 'venta';
  idJugador: string;
  jugador: string;
  cantidadTokens: number;
  cotizacion: string;
  importe: string;
  fechaHora: Date;
}

@Injectable()
export class PortfolioService {
  constructor(@Inject(PLAYERS_DATA_SOURCE) private readonly dataSource: DataSource) {}

  async obtener(usuarioId: string) {
    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      const usuarios = (await manager.query(
        'SELECT id FROM usuarios WHERE id = $1',
        [usuarioId],
      )) as Array<{ id: string }>;
      if (!usuarios[0]) throw new NotFoundException('Usuario no encontrado.');

      const saldos = (await manager.query(
        'SELECT creditos_disponibles::text AS "creditosDisponibles" FROM saldos_usuario WHERE id_usuario = $1',
        [usuarioId],
      )) as Array<{ creditosDisponibles: string }>;
      const posiciones = (await manager.query(
        `SELECT tenencia.id_jugador AS "idJugador",
                jugador.nombre,
                equipo.nombre AS equipo,
                liga.codigo AS liga,
                tenencia.cantidad_tokens AS "cantidadTokens",
                vigente.cotizacion::text AS cotizacion,
                vigente.fecha_hora AS "fechaCotizacion"
         FROM tenencias_jugador tenencia
         JOIN jugadores jugador ON jugador.id = tenencia.id_jugador
         JOIN equipos equipo ON equipo.id = jugador.equipo_id
         JOIN ligas liga ON liga.id = equipo.liga_id
         LEFT JOIN recalculo_cotizacion_activo activo ON activo.id = 1
         LEFT JOIN cotizacion_vigente vigente
           ON vigente.id_jugador = tenencia.id_jugador
          AND vigente.tipo_estrategia = activo.tipo_estrategia
          AND vigente.id_recalculo = activo.id_recalculo
         WHERE tenencia.id_usuario = $1 AND tenencia.cantidad_tokens > 0
         ORDER BY jugador.nombre ASC, jugador.id ASC`,
        [usuarioId],
      )) as PortfolioPositionRow[];
      const operaciones = (await manager.query(
        `SELECT operacion.id_operacion AS "idOperacion",
                lower(operacion.tipo) AS tipo,
                operacion.id_jugador AS "idJugador",
                jugador.nombre AS jugador,
                operacion.cantidad_tokens AS "cantidadTokens",
                operacion.cotizacion::text AS cotizacion,
                operacion.importe_creditos::text AS importe,
                operacion.fecha_hora AS "fechaHora"
         FROM transacciones_mercado operacion
         JOIN jugadores jugador ON jugador.id = operacion.id_jugador
         WHERE (operacion.tipo = 'COMPRA' AND operacion.id_usuario_comprador = $1)
            OR (operacion.tipo = 'VENTA' AND operacion.id_usuario_vendedor = $1)
         ORDER BY operacion.fecha_hora DESC, operacion.id_operacion DESC`,
        [usuarioId],
      )) as TradeRow[];
      const costosPromedio = await this.obtenerCostosPromedio(manager, usuarioId);

      const items = posiciones.map((posicion) => {
        const costo = costosPromedio.get(posicion.idJugador);
        const costoBase = costo && costo.cantidad > 0
          ? redondearDivision(costo.unidades, BigInt(costo.cantidad)) * BigInt(posicion.cantidadTokens)
          : 0n;
        const cotizacionUnidades = posicion.cotizacion === null
          ? null
          : Creditos.fromDecimal(posicion.cotizacion).toUnidades();
        const valorActual = cotizacionUnidades === null
          ? null
          : cotizacionUnidades * BigInt(posicion.cantidadTokens);
        return {
          idJugador: posicion.idJugador,
          jugador: posicion.nombre,
          equipo: posicion.equipo,
          liga: posicion.liga,
          cantidadTokens: posicion.cantidadTokens,
          cotizacion: posicion.cotizacion,
          fechaCotizacion: posicion.fechaCotizacion,
          precioPromedioCompra: costo && costo.cantidad > 0
            ? Creditos.fromUnidades(redondearDivision(costo.unidades, BigInt(costo.cantidad))).toDecimalString()
            : null,
          valorActual: valorActual === null ? null : Creditos.fromUnidades(valorActual).toDecimalString(),
          gananciaPerdida: valorActual === null
            ? null
            : formatSignedUnits(valorActual - costoBase),
        };
      });

      const totalValor = items.reduce((total, item) =>
        total + (item.valorActual === null ? 0n : Creditos.fromDecimal(item.valorActual).toUnidades()), 0n);
      const totalCosto = items.reduce((total, item) => {
        if (item.valorActual === null) return total;
        const costo = costosPromedio.get(item.idJugador);
        if (!costo || costo.cantidad === 0) return total;
        return total + redondearDivision(costo.unidades, BigInt(costo.cantidad)) * BigInt(item.cantidadTokens);
      }, 0n);

      return {
        creditosDisponibles: saldos[0]
          ? Creditos.fromUnidades(BigInt(saldos[0].creditosDisponibles)).toDecimalString()
          : '0.00',
        valorTotal: Creditos.fromUnidades(totalValor).toDecimalString(),
        gananciaPerdidaTotal: formatSignedUnits(totalValor - totalCosto),
        posiciones: items,
        operacionesRecientes: operaciones.map((operacion) => ({
          ...operacion,
          cotizacion: formatNumericDecimal(operacion.cotizacion),
          importe: Creditos.fromUnidades(BigInt(operacion.importe)).toDecimalString(),
        })),
      };
    });
  }

  private async obtenerCostosPromedio(manager: import('typeorm').EntityManager, usuarioId: string) {
    const movimientos = (await manager.query(
      `SELECT operacion.id_jugador AS "idJugador",
              operacion.cantidad_tokens AS cantidad,
              operacion.importe_creditos::text AS importe,
              lower(operacion.tipo) AS tipo,
              operacion.fecha_hora AS "fechaHora",
              operacion.id_operacion AS id
       FROM transacciones_mercado operacion
       WHERE (operacion.tipo = 'COMPRA' AND operacion.id_usuario_comprador = $1)
          OR (operacion.tipo = 'VENTA' AND operacion.id_usuario_vendedor = $1)
       ORDER BY operacion.fecha_hora ASC, operacion.id_operacion ASC`,
      [usuarioId],
    )) as Array<{
      idJugador: string;
      cantidad: number;
      importe: string;
      tipo: 'compra' | 'venta';
    }>;
    const posiciones = new Map<string, { cantidad: number; unidades: bigint }>();
    for (const movimiento of movimientos) {
      const posicion = posiciones.get(movimiento.idJugador) ?? { cantidad: 0, unidades: 0n };
      const cantidad = Number(movimiento.cantidad);
      const importe = BigInt(movimiento.importe);
      if (movimiento.tipo === 'compra') {
        posicion.cantidad += cantidad;
        posicion.unidades += importe;
      } else if (posicion.cantidad > 0 && cantidad <= posicion.cantidad) {
        posicion.unidades -= redondearDivision(
          posicion.unidades * BigInt(cantidad),
          BigInt(posicion.cantidad),
        );
        posicion.cantidad -= cantidad;
        if (posicion.cantidad === 0) posicion.unidades = 0n;
      }
      posiciones.set(movimiento.idJugador, posicion);
    }
    return posiciones;
  }
}

function redondearDivision(numerador: bigint, denominador: bigint): bigint {
  if (denominador <= 0n) return 0n;
  return (numerador + denominador / 2n) / denominador;
}

function formatSignedUnits(unidades: bigint): string {
  if (unidades >= 0n) return Creditos.fromUnidades(unidades).toDecimalString();
  return `-${Creditos.fromUnidades(-unidades).toDecimalString()}`;
}

function formatNumericDecimal(value: string): string {
  return Creditos.fromDecimal(value).toDecimalString();
}
