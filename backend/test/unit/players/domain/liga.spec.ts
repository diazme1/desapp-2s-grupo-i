import { Liga } from '../../../../src/players/domain/liga';

describe('Liga', () => {
  it('normaliza codigo y genera un identificador estable', () => {
    const liga = Liga.crear({ codigo: ' Premier-League ', nombre: 'Premier League' });

    expect(liga.codigo).toBe('premier-league');
    expect(liga.id).toBeTruthy();
  });

  it('rechaza un nombre vacío', () => {
    expect(() => Liga.crear({ codigo: 'serie-a', nombre: ' ' })).toThrow(
      'El campo nombre de liga es obligatorio.',
    );
  });
});
