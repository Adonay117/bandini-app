export function validarTelefono(telefono: string): boolean {
  return /^[267]\d{3}-?\d{4}$/.test(telefono.trim());
}

export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Máscara de teléfono salvadoreño mientras se escribe: "71234567" -> "7123-4567". */
export function formatearTelefono(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  return digitos.length > 4 ? `${digitos.slice(0, 4)}-${digitos.slice(4)}` : digitos;
}
