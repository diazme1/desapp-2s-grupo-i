import {
  cargarAliasesEquipos,
  normalizarLigaAlias,
  resolverAliasEquipo,
} from '../../../src/players/team-aliases';

const aliases = cargarAliasesEquipos();

describe('aliases de equipos', () => {
  it('normaliza LaLiga y Primera Division a la misma configuración', () => {
    expect(normalizarLigaAlias('LaLiga')).toBe('la liga');
    expect(normalizarLigaAlias('Primera Division')).toBe('la liga');
  });

  it.each([
    ['Premier League', 'Brighton & Hove Albion FC', 'Brighton'],
    ['Premier League', 'Brighton Hove', 'Brighton'],
    ['Premier League', 'Manchester United FC', 'Man Utd'],
    ['Bundesliga', '1. FC Köln', 'FC Koln'],
    ['Bundesliga', "M'gladbach", 'Borussia M.Gladbach'],
    ['Bundesliga', 'Hamburger SV', 'Hamburg'],
    ['Bundesliga', 'RB Leipzig', 'RBL'],
    ['Bundesliga', 'Bremen', 'Werder Bremen'],
    ['LaLiga', 'Club Atlético de Madrid', 'Atletico'],
    ['Primera Division', 'Celta', 'Celta Vigo'],
    ['Primera Division', 'Real Racing Club de Santander', 'Racing Santander'],
    ['Serie A', 'Como 1907', 'Como'],
    ['Ligue 1', 'Angers SCO', 'Angers'],
    ['Ligue 1', 'Olympique Lyonnais', 'Lyon'],
    ['Ligue 1', 'RC Lens', 'Lens'],
    ['Ligue 1', 'Stade Rennais', 'Rennes'],
  ])('resuelve %s: %s -> %s', (liga, variante, canonico) => {
    expect(resolverAliasEquipo(variante, liga, aliases)).toBe(
      resolverAliasEquipo(canonico, liga, aliases),
    );
  });

  it('no comparte aliases entre ligas', () => {
    expect(resolverAliasEquipo('RC Lens', 'Premier League', aliases)).toBe('rc lens');
    expect(resolverAliasEquipo('RC Lens', 'Ligue 1', aliases)).toBe('lens');
  });
});
