'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useClientes } from '@/lib/hooks/useClientes';
import { validarEmail, validarTelefono } from '@/lib/utils/validators';
import { Cliente, DEPARTAMENTOS_SV } from '@/lib/types';

export function ClienteForm({ cliente, onGuardado }: { cliente?: Cliente; onGuardado?: () => void }) {
  const router = useRouter();
  const { crearCliente, actualizarCliente } = useClientes();
  const editando = cliente !== undefined;

  const [nombre, setNombre] = useState(cliente?.nombre ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [fechaNacimiento, setFechaNacimiento] = useState(cliente?.fecha_nacimiento?.slice(0, 10) ?? '');
  const [departamento, setDepartamento] = useState(cliente?.departamento ?? '');
  const [lugar, setLugar] = useState(cliente?.lugar ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const telefonoValido = telefono.trim() !== '' && validarTelefono(telefono);
  const emailValido = email.trim() === '' || validarEmail(email);
  const valido = nombre.trim() !== '' && telefonoValido && emailValido;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim() || undefined,
        fecha_nacimiento: fechaNacimiento || undefined,
        departamento: departamento || undefined,
        lugar: lugar.trim() || undefined,
      };

      if (editando) {
        await actualizarCliente(cliente.id, payload);
        onGuardado?.();
      } else {
        await crearCliente(payload);
        router.push('/clientes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar cliente');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={editando ? 'flex flex-col gap-4' : 'flex max-w-lg flex-col gap-4 rounded-2xl border border-secondary/70 bg-white p-6 shadow-sm'}
    >
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      <Input
        label="Teléfono"
        placeholder="7123-4567"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        error={telefono.trim() !== '' && !telefonoValido ? 'Teléfono inválido' : undefined}
        required
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={!emailValido ? 'Email inválido' : undefined}
      />
      <Input
        label="Fecha de nacimiento"
        type="date"
        value={fechaNacimiento}
        onChange={(e) => setFechaNacimiento(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Departamento" value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
          <option value="">Sin especificar</option>
          {DEPARTAMENTOS_SV.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Input
          label="Lugar (municipio/dirección)"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={!valido || submitting}>
        {submitting ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear cliente'}
      </Button>
    </form>
  );
}
