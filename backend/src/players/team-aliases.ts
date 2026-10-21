import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

export type TeamAliases = Record<string, Record<string, string>>;

interface TeamAliasesFile {
  aliases?: unknown;
}

const TEAM_ALIASES_PATH = resolve(__dirname, '../config/team-aliases.yaml');

export function cargarAliasesEquipos(path = TEAM_ALIASES_PATH): TeamAliases {
  const contenido = readFileSync(path, 'utf8');
  const documento = parse(contenido) as TeamAliasesFile;

  if (!documento || typeof documento !== 'object' || !esRegistro(documento.aliases)) {
    throw new Error(`La configuración de aliases de equipos es inválida: ${path}`);
  }

  const aliases: TeamAliases = {};
  for (const [liga, equipos] of Object.entries(documento.aliases)) {
    if (!esRegistro(equipos)) {
      throw new Error(`Los aliases de la liga ${liga} deben ser un objeto.`);
    }

    const ligaNormalizada = normalizarLigaAlias(liga);
    aliases[ligaNormalizada] ??= {};

    for (const [canonico, variantes] of Object.entries(equipos)) {
      if (!Array.isArray(variantes) || !variantes.every((variante) => typeof variante === 'string')) {
        throw new Error(`Las variantes del equipo ${canonico} deben ser un arreglo de strings.`);
      }

      const nombreCanonico = normalizarEquipoBase(canonico);
      if (!nombreCanonico) {
        throw new Error(`El nombre canónico del equipo ${canonico} es inválido.`);
      }

      aliases[ligaNormalizada][nombreCanonico] = nombreCanonico;
      for (const variante of variantes) {
        const varianteNormalizada = normalizarEquipoBase(variante);
        if (!varianteNormalizada) {
          throw new Error(`La variante del equipo ${canonico} es inválida.`);
        }
        aliases[ligaNormalizada][varianteNormalizada] = nombreCanonico;
      }
    }
  }

  return aliases;
}

export function resolverAliasEquipo(
  value: string,
  liga: string,
  aliases: TeamAliases,
): string {
  const nombreNormalizado = normalizarEquipoBase(value);
  return aliases[normalizarLigaAlias(liga)]?.[nombreNormalizado] ?? nombreNormalizado;
}

export function normalizarLigaAlias(value: string): string {
  const normalized = normalizarTexto(value);
  if (['la liga', 'laliga', 'primera division'].includes(normalized)) return 'la liga';
  return normalized;
}

function normalizarEquipoBase(value: string): string {
  const partes = normalizarTexto(value).split(' ');
  const sufijos = ['afc', 'fc', 'cf', 'sc', 'ac'];
  if (sufijos.includes(partes[0])) partes.shift();
  if (sufijos.includes(partes[partes.length - 1])) partes.pop();
  return partes.join(' ');
}

function normalizarTexto(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function esRegistro(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
