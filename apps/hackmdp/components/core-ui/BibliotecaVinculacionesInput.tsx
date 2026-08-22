"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Wrench, X, Search } from "lucide-react";
import { BibliotecaVinculo } from "@/lib/types";

interface BibliotecaVinculacionesInputProps {
  value: BibliotecaVinculo[];
  onChange: (vinculos: BibliotecaVinculo[]) => void;
}

interface SearchResult {
  tipo: 'equipo' | 'producto';
  id: string;
  nombre: string;
}

async function searchEntidades(q: string): Promise<SearchResult[]> {
  if (q.length < 2) return [];
  const [equiposRes, productosRes] = await Promise.all([
    fetch(`/api/equipos?search=${encodeURIComponent(q)}`),
    fetch(`/api/productos?search=${encodeURIComponent(q)}&pageSize=10`),
  ]);

  const results: SearchResult[] = [];

  if (equiposRes.ok) {
    const equipos = await equiposRes.json();
    const list = Array.isArray(equipos) ? equipos : (equipos.data || []);
    list.slice(0, 8).forEach((e: any) => {
      results.push({ tipo: 'equipo', id: e.id, nombre: `${e.marca} ${e.modelo}` });
    });
  }

  if (productosRes.ok) {
    const data = await productosRes.json();
    const list = Array.isArray(data) ? data : (data.data || []);
    list.slice(0, 8).forEach((p: any) => {
      results.push({ tipo: 'producto', id: p.id, nombre: p.nombre });
    });
  }

  return results;
}

export function BibliotecaVinculacionesInput({ value, onChange }: BibliotecaVinculacionesInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const r = await searchEntidades(q);
    setResults(r);
    setShowResults(true);
  }, []);

  const addVinculo = (r: SearchResult) => {
    if (value.some(v => v.entidad_tipo === r.tipo && v.entidad_id === r.id)) return;
    onChange([...value, { entidad_tipo: r.tipo, entidad_id: r.id, entidad_nombre: r.nombre }]);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const removeVinculo = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar equipo o producto..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          className="pl-9"
        />
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {results.map((r) => (
              <button
                key={`${r.tipo}-${r.id}`}
                type="button"
                onMouseDown={() => addVinculo(r)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-sm"
              >
                {r.tipo === 'equipo' ? (
                  <Wrench className="h-4 w-4 text-blue-500" />
                ) : (
                  <Package className="h-4 w-4 text-emerald-500" />
                )}
                <span className="flex-1">{r.nombre}</span>
                <span className="text-xs text-muted-foreground">{r.tipo}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, idx) => (
            <Badge key={`${v.entidad_tipo}-${v.entidad_id}`} variant="outline" className="gap-1 pl-2 pr-1">
              {v.entidad_tipo === 'equipo' ? (
                <Wrench className="h-3 w-3 text-blue-500" />
              ) : (
                <Package className="h-3 w-3 text-emerald-500" />
              )}
              <span className="text-xs">{v.entidad_nombre || v.entidad_id.slice(0, 8)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeVinculo(idx)}
                className="h-4 w-4 p-0 hover:bg-red-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
