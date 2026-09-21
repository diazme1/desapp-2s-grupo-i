export function normalizarTexto(value: string, campo: string): string {
  const normalizado = value.trim().replace(/\s+/g, ' ');
  if (!normalizado) throw new Error(`El campo ${campo} es obligatorio.`);
  return normalizado;
}

export function normalizarClave(value: string, campo: string): string {
  return normalizarTexto(value, campo).toLocaleLowerCase('es');
}
