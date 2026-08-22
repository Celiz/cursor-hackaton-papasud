"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Phone, MessageCircle, Mail } from "lucide-react";

function pickContact(v: unknown): string | null {
  if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : null;
  if (typeof v === "string" && v.trim()) return v;
  return null;
}
function normalizarTel(t?: string | null): string | null {
  if (!t) return null;
  const soloNum = t.replace(/[^\d]/g, "");
  return soloNum.length >= 8 ? soloNum : null;
}

function Acciones({ telefono, email }: { telefono?: string | null; email?: string | null }) {
  const tel = normalizarTel(telefono);
  return (
    <div className="flex gap-3">
      {tel && (
        <>
          <a href={`tel:${tel}`} className="flex-1 flex items-center justify-center gap-2 rounded-lg border py-2">
            <Phone className="h-4 w-4" /> Llamar
          </a>
          <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 rounded-lg border py-2">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </>
      )}
      {email && (
        <a href={`mailto:${email}`} className="flex-1 flex items-center justify-center gap-2 rounded-lg border py-2">
          <Mail className="h-4 w-4" /> Mail
        </a>
      )}
    </div>
  );
}

// ---- Clientes ----
type Cliente = { id: string; nombre: string; saldo?: number | null; telefono?: string | null; email?: string | null };

function TabClientes() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [sel, setSel] = useState<Cliente | null>(null);

  async function buscar(v: string) {
    setQ(v);
    if (v.trim().length < 2) return setResultados([]);
    const r = await fetch(`/api/clientes?search=${encodeURIComponent(v)}&include_stats=true`);
    const data = await r.json();
    const arr = Array.isArray(data) ? data : data.clientes ?? data.rows ?? [];
    setResultados(
      arr.slice(0, 15).map((c: any) => ({
        id: c.id,
        nombre: c.nombre_fantasia || c.nombre,
        saldo: c.saldo ?? null,
        telefono: pickContact(c.datos_contacto?.telefono ?? c.telefono),
        email: pickContact(c.datos_contacto?.email ?? c.email),
      })),
    );
  }

  return (
    <div className="space-y-4">
      <Input placeholder="Buscar por nombre…" value={q} onChange={(e) => buscar(e.target.value)} />
      <div className="space-y-2">
        {resultados.map((c) => (
          <button key={c.id} onClick={() => setSel(c)} className="w-full text-left rounded-lg border p-3">
            <div className="font-medium">{c.nombre}</div>
            {c.saldo != null && (
              <div className={`text-sm ${c.saldo > 0 ? "text-red-600" : "text-muted-foreground"}`}>Saldo: ${Number(c.saldo).toLocaleString("es-AR")}</div>
            )}
          </button>
        ))}
      </div>
      {sel && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="font-semibold text-lg">{sel.nombre}</div>
          {sel.saldo != null && <div>Saldo cta cte: ${Number(sel.saldo).toLocaleString("es-AR")}</div>}
          <Acciones telefono={sel.telefono} email={sel.email} />
        </div>
      )}
    </div>
  );
}

// ---- Contactos ----
type Contacto = { id: string; nombre: string; empresa?: string; telefono?: string | null; email?: string | null; cargo?: string | null };

function TabContactos() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Contacto[]>([]);
  const [sel, setSel] = useState<Contacto | null>(null);

  async function buscar(v: string) {
    setQ(v);
    if (v.trim().length < 2) return setResultados([]);
    const r = await fetch(`/api/contactos?search=${encodeURIComponent(v)}`);
    const data = await r.json();
    const arr = Array.isArray(data) ? data : data.contactos ?? data.rows ?? [];
    setResultados(
      arr.slice(0, 15).map((c: any) => ({
        id: c.id,
        nombre: `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim() || "—",
        empresa: c.empresa_fantasia || c.empresa_nombre || undefined,
        cargo: c.cargo ?? null,
        telefono: pickContact(c.telefono),
        email: pickContact(c.email),
      })),
    );
  }

  return (
    <div className="space-y-4">
      <Input placeholder="Buscar contacto…" value={q} onChange={(e) => buscar(e.target.value)} />
      <div className="space-y-2">
        {resultados.map((c) => (
          <button key={c.id} onClick={() => setSel(c)} className="w-full text-left rounded-lg border p-3">
            <div className="font-medium">{c.nombre}</div>
            {(c.empresa || c.cargo) && (
              <div className="text-sm text-muted-foreground truncate">{[c.cargo, c.empresa].filter(Boolean).join(" · ")}</div>
            )}
          </button>
        ))}
      </div>
      {sel && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="font-semibold text-lg">{sel.nombre}</div>
          {(sel.empresa || sel.cargo) && <div className="text-sm text-muted-foreground">{[sel.cargo, sel.empresa].filter(Boolean).join(" · ")}</div>}
          <Acciones telefono={sel.telefono} email={sel.email} />
        </div>
      )}
    </div>
  );
}

export default function ClientesPage() {
  const [tab, setTab] = useState<"clientes" | "contactos">("clientes");
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Clientes</h1>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        {(["clientes", "contactos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md py-2 text-sm font-medium ${tab === t ? "bg-background shadow" : "text-muted-foreground"}`}
          >
            {t === "clientes" ? "Clientes" : "Contactos"}
          </button>
        ))}
      </div>
      {tab === "clientes" ? <TabClientes /> : <TabContactos />}
    </div>
  );
}
