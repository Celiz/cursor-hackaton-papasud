'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { puedeEditar } from '@/lib/equipo-authz';

interface Miembro {
  persona_id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  rol: string;          // acceso (owner/admin/employee) — se usa para el gate read-only
  rol_id: string | null;    // rol funcional (perfiles.rol_id → roles)
  rol_nombre: string | null;
  last_login: string | null;
}

interface Rol { id: string; nombre: string; color: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  personaId: string | null;
  actorRol: string;
  onSuccess: () => void;
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Error');
  return d;
};

export function MiembroDetailSheet({ open, onOpenChange, personaId, actorRol, onSuccess }: Props) {
  // revalidateOnFocus/IfStale off: este SWR es el snapshot del form, no una vista
  // viva — un refetch en background pisaría lo que el admin está tipeando.
  const { data: miembro, error, isLoading, mutate } = useSWR<Miembro>(
    open && personaId ? `/api/equipo/${personaId}` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );
  const { data: roles } = useSWR<Rol[]>(open ? '/api/roles' : null, fetcher);

  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', rol_id: '' });
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (miembro) {
      setForm({
        nombre: miembro.nombre || '',
        apellido: miembro.apellido || '',
        email: miembro.email || '',
        rol_id: miembro.rol_id || '',
      });
      setPw('');
      setPw2('');
    }
  }, [miembro]);

  const readOnly = miembro ? !puedeEditar(actorRol, miembro.rol) : false;

  const guardar = async () => {
    if (!personaId) return;
    if (pw || pw2) {
      if (pw !== pw2) { toast.error('Las contraseñas no coinciden'); return; }
      if (pw.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        nombre: form.nombre, apellido: form.apellido, email: form.email,
      };
      if (form.rol_id) body.rol_id = form.rol_id;
      if (pw) body.new_password = pw;
      const r = await fetch(`/api/equipo/${personaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Error al guardar');
      toast.success('Usuario actualizado');
      await mutate(); // revalida el detalle: al reabrir este usuario se ve el estado ya guardado
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{miembro?.nombre || 'Usuario'}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : error || !miembro ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No se pudo cargar el usuario{error?.message ? `: ${error.message}` : ''}.
          </div>
        ) : (
          <div className="mx-auto w-full max-w-xl px-1 py-4 space-y-5">
            {readOnly && (
              <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                <ShieldAlert className="h-4 w-4 shrink-0" /> Solo un owner puede editar a otro owner.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nombre</Label><Input value={form.nombre} disabled={readOnly} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
              <div><Label>Apellido</Label><Input value={form.apellido} disabled={readOnly} onChange={(e) => setForm({ ...form, apellido: e.target.value })} /></div>
              <div className="col-span-2"><Label>Email (login)</Label><Input type="email" value={form.email} disabled={readOnly} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div>
                <Label>Rol</Label>
                <Select value={form.rol_id} onValueChange={(v) => setForm({ ...form, rol_id: v })} disabled={readOnly}>
                  <SelectTrigger><SelectValue placeholder="Sin rol asignado" /></SelectTrigger>
                  <SelectContent>
                    {(roles || []).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color || '#6366f1' }} />
                          {r.nombre}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end text-xs text-muted-foreground">
                Último login: {miembro?.last_login ? new Date(miembro.last_login).toLocaleString('es-AR') : '—'}
              </div>
            </div>

            {!readOnly && (
              <div className="border-t pt-4">
                <Label className="mb-2 block">Resetear contraseña</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="password" placeholder="Nueva contraseña" value={pw} onChange={(e) => setPw(e.target.value)} />
                  <Input type="password" placeholder="Repetir" value={pw2} onChange={(e) => setPw2(e.target.value)} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Dejalo vacío para no cambiarla.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cerrar</Button>
              {!readOnly && (
                <Button onClick={guardar} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Guardar
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
