'use client';

import { sileo } from 'sileo';

// Mensajes de acción (toasts) de toda la app, sobre Sileo. Cada acción que
// cambia datos pasa por `notificar`: muestra "cargando" mientras corre y se
// transforma en éxito o error al terminar. La promesa se devuelve tal cual,
// así que el llamador sigue pudiendo usar el resultado o capturar el error.

type Mensaje<T> = string | ((data: T) => string);

interface OpcionesNotificar<T> {
  cargando?: string;
  exito: Mensaje<T>;
  // Título del toast de error; la descripción es el mensaje real del error.
  error?: string;
  descripcion?: Mensaje<T>;
}

function resolver<T>(mensaje: Mensaje<T> | undefined, data: T): string | undefined {
  return typeof mensaje === 'function' ? mensaje(data) : mensaje;
}

export function mensajeDeError(err: unknown, porDefecto = 'Ocurrió un error inesperado'): string {
  return err instanceof Error && err.message ? err.message : porDefecto;
}

export function notificar<T>(
  accion: Promise<T> | (() => Promise<T>),
  { cargando = 'Guardando…', exito, error = 'No se pudo completar', descripcion }: OpcionesNotificar<T>
): Promise<T> {
  return sileo.promise(accion, {
    loading: { title: cargando },
    success: (data) => ({ title: resolver(exito, data), description: resolver(descripcion, data) }),
    error: (err) => ({ title: error, description: mensajeDeError(err), duration: 6000 }),
  });
}

// Avisos sueltos, para acciones que no son una promesa (copiar, validaciones).
notificar.exito = (title: string, description?: string) => sileo.success({ title, description });
notificar.error = (title: string, description?: string) => sileo.error({ title, description, duration: 6000 });
notificar.aviso = (title: string, description?: string) => sileo.warning({ title, description });
notificar.info = (title: string, description?: string) => sileo.info({ title, description });
