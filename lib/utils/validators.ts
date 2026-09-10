export function validarTelefono(telefono: string): boolean {
  return /^[267]\d{3}-?\d{4}$/.test(telefono.trim());
}

export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
