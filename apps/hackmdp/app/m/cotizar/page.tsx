"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClienteLite = { id: string; nombre: string };
type Item = { descripcion: string; cantidad: number; precio_unitario: number };

async function buscarClientes(q: string): Promise<ClienteLite[]> {
  if (q.trim().length < 2) return [];
  const r = await fetch(`/api/clientes?search=${encodeURIComponent(q)}`);
  const data = await r.json();
  const arr = Array.isArray(data) ? data : data.clientes ?? data.rows ?? [];
  return arr.slice(0, 8).map((c: any) => ({ id: c.id, nombre: c.nombre_fantasia || c.nombre }));
}

export default function CotizarPage() {
  const [modo, setModo] = useState<"cotizar" | "venta">("cotizar");
  const [q, setQ] = useState("");
  const [opciones, setOpciones] = useState<ClienteLite[]>([]);
  const [cliente, setCliente] = useState<ClienteLite | null>(null);
  const [items, setItems] = useState<Item[]>([{ descripcion: "", cantidad: 1, precio_unitario: 0 }]);
  const [busy, setBusy] = useState(false);

  const total = items.reduce((s, it) => s + (it.cantidad || 0) * (it.precio_unitario || 0), 0);

  function setItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function guardar() {
    if (!cliente) return toast.error("Elegí un cliente");
    const itemsValidos = items.filter((it) => it.descripcion.trim());
    if (itemsValidos.length === 0) return toast.error("Cargá al menos un ítem");
    setBusy(true);
    try {
      if (modo === "cotizar") {
        const itemsPres = itemsValidos.map((it) => ({
          tipo: "accesorio",
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          subtotal: it.cantidad * it.precio_unitario,
          iva_porcentaje: 10.5,
        }));
        const r = await fetch("/api/presupuestos-equipos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente_id: cliente.id,
            titulo: "Cotización rápida",
            moneda: "ARS",
            precio_base: total,
            subtotal: total,
            total,
            items: itemsPres,
          }),
        });
        if (!r.ok) throw new Error("No se pudo crear el presupuesto");
        toast.success("Presupuesto borrador creado");
      } else {
        const itemsIvr = itemsValidos.map((it) => ({
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          subtotal: it.cantidad * it.precio_unitario,
        }));
        const r = await fetch("/api/ivr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cliente_id: cliente.id, total, subtotal: total, items: itemsIvr }),
        });
        if (!r.ok) throw new Error("No se pudo crear el IVR");
        toast.success("Venta (IVR) registrada");
      }
      setItems([{ descripcion: "", cantidad: 1, precio_unitario: 0 }]);
      setCliente(null);
      setQ("");
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Cotizar / Vender</h1>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        {(["cotizar", "venta"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`rounded-md py-2 text-sm font-medium ${modo === m ? "bg-background shadow" : "text-muted-foreground"}`}
          >
            {m === "cotizar" ? "Cotizar" : "Venta rápida"}
          </button>
        ))}
      </div>

      {/* Cliente */}
      {cliente ? (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="font-medium">{cliente.nombre}</span>
          <button className="text-xs underline text-muted-foreground" onClick={() => setCliente(null)}>Cambiar</button>
        </div>
      ) : (
        <div>
          <Input
            placeholder="Buscar cliente…"
            value={q}
            onChange={async (e) => {
              setQ(e.target.value);
              setOpciones(await buscarClientes(e.target.value));
            }}
          />
          {opciones.length > 0 && (
            <ul className="mt-1 rounded-lg border divide-y">
              {opciones.map((o) => (
                <li key={o.id}>
                  <button className="w-full text-left p-3" onClick={() => { setCliente(o); setOpciones([]); }}>
                    {o.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Ítems */}
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <Input placeholder="Descripción" value={it.descripcion} onChange={(e) => setItem(i, { descripcion: e.target.value })} />
            <div className="flex gap-2">
              <Input type="number" inputMode="numeric" className="w-20" value={it.cantidad} onChange={(e) => setItem(i, { cantidad: Number(e.target.value) })} />
              <Input type="number" inputMode="decimal" placeholder="Precio" value={it.precio_unitario} onChange={(e) => setItem(i, { precio_unitario: Number(e.target.value) })} />
            </div>
          </div>
        ))}
        <button className="text-sm text-primary" onClick={() => setItems((p) => [...p, { descripcion: "", cantidad: 1, precio_unitario: 0 }])}>
          + Agregar ítem
        </button>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-semibold">${total.toLocaleString("es-AR")}</span>
      </div>

      <Button className="w-full" disabled={busy} onClick={guardar}>
        {modo === "cotizar" ? "Crear presupuesto" : "Registrar venta"}
      </Button>
    </div>
  );
}
