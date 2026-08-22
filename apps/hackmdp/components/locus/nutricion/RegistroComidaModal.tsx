"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { X, Search, Sparkles, Camera, Loader2, Trash2, Plus, Minus } from "lucide-react"
import { MOMENTO_LABELS } from "@/lib/nutricion/types"
import type { Momento, NutAlimento } from "@/lib/nutricion/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewItem {
  nombre: string
  cantidad_g: number
  original_cantidad_g: number // for proportional recalculation
  calorias: number
  original_calorias: number
  proteinas_g: number
  original_proteinas_g: number
  carbohidratos_g: number
  original_carbohidratos_g: number
  grasas_g: number
  original_grasas_g: number
  fibra_g: number
  original_fibra_g: number
  alimento_id: string | null
}

interface Props {
  momento: Momento
  fecha: string // YYYY-MM-DD
  onClose: () => void
  onSaved: () => void
}

type Tab = "texto" | "buscar" | "foto"
type Step = "input" | "review"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function recalcItem(item: ReviewItem, newG: number): ReviewItem {
  const ratio = item.original_cantidad_g > 0 ? newG / item.original_cantidad_g : 0
  return {
    ...item,
    cantidad_g: newG,
    calorias: Math.round(item.original_calorias * ratio),
    proteinas_g: Math.round(item.original_proteinas_g * ratio * 10) / 10,
    carbohidratos_g: Math.round(item.original_carbohidratos_g * ratio * 10) / 10,
    grasas_g: Math.round(item.original_grasas_g * ratio * 10) / 10,
    fibra_g: Math.round(item.original_fibra_g * ratio * 10) / 10,
  }
}

function sumItems(items: ReviewItem[]) {
  return items.reduce(
    (acc, i) => ({
      calorias: acc.calorias + i.calorias,
      proteinas: acc.proteinas + i.proteinas_g,
      carbohidratos: acc.carbohidratos + i.carbohidratos_g,
      grasas: acc.grasas + i.grasas_g,
      fibra: acc.fibra + i.fibra_g,
    }),
    { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, fibra: 0 }
  )
}

function alimentoToReviewItem(alimento: NutAlimento, cantidadG: number): ReviewItem {
  const ratio = cantidadG / 100
  return {
    nombre: alimento.nombre,
    cantidad_g: cantidadG,
    original_cantidad_g: cantidadG,
    calorias: Math.round(alimento.calorias_100g * ratio),
    original_calorias: Math.round(alimento.calorias_100g * ratio),
    proteinas_g: Math.round(alimento.proteinas_100g * ratio * 10) / 10,
    original_proteinas_g: Math.round(alimento.proteinas_100g * ratio * 10) / 10,
    carbohidratos_g: Math.round(alimento.carbohidratos_100g * ratio * 10) / 10,
    original_carbohidratos_g: Math.round(alimento.carbohidratos_100g * ratio * 10) / 10,
    grasas_g: Math.round(alimento.grasas_100g * ratio * 10) / 10,
    original_grasas_g: Math.round(alimento.grasas_100g * ratio * 10) / 10,
    fibra_g: Math.round(alimento.fibra_100g * ratio * 10) / 10,
    original_fibra_g: Math.round(alimento.fibra_100g * ratio * 10) / 10,
    alimento_id: alimento.id,
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RegistroComidaModal({ momento, fecha, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>("texto")
  const [step, setStep] = useState<Step>("input")

  // Tab 1: Texto libre
  const [texto, setTexto] = useState("")
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  // Tab 2: Buscar
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<NutAlimento[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedAlimento, setSelectedAlimento] = useState<NutAlimento | null>(null)
  const [selectedCantidad, setSelectedCantidad] = useState<number>(100)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tab 3: Foto
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Shared: Review
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [reviewNombre, setReviewNombre] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [origen, setOrigen] = useState<"ia_texto" | "manual">("manual")

  // Ref for backdrop click
  const backdropRef = useRef<HTMLDivElement>(null)

  // -------------------------------------------------------------------------
  // Tab 1: AI parse
  // -------------------------------------------------------------------------

  const handleParsear = useCallback(async () => {
    if (!texto.trim()) return
    setParsing(true)
    setParseError(null)
    try {
      const res = await fetch("/api/locus/nutricion/ai/parsear-comida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto.trim(), momento }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al analizar")
      }
      const data = await res.json()
      const items: ReviewItem[] = (data.items || []).map((item: any) => ({
        nombre: item.nombre,
        cantidad_g: item.cantidad_g || 0,
        original_cantidad_g: item.cantidad_g || 0,
        calorias: item.calorias || 0,
        original_calorias: item.calorias || 0,
        proteinas_g: item.proteinas_g || 0,
        original_proteinas_g: item.proteinas_g || 0,
        carbohidratos_g: item.carbohidratos_g || 0,
        original_carbohidratos_g: item.carbohidratos_g || 0,
        grasas_g: item.grasas_g || 0,
        original_grasas_g: item.grasas_g || 0,
        fibra_g: item.fibra_g || 0,
        original_fibra_g: item.fibra_g || 0,
        alimento_id: item.alimento_id || null,
      }))
      setReviewItems(items)
      setReviewNombre(data.nombre || "Comida")
      setOrigen("ia_texto")
      setStep("review")
    } catch (err: any) {
      setParseError(err.message || "Error inesperado")
    } finally {
      setParsing(false)
    }
  }, [texto, momento])

  // -------------------------------------------------------------------------
  // Tab 2: Food search (debounced)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/locus/nutricion/alimentos?search=${encodeURIComponent(searchQuery.trim())}&limit=10`
        )
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data)
        }
      } catch {
        // silent
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchQuery])

  const handleSelectAlimento = useCallback((alimento: NutAlimento) => {
    setSelectedAlimento(alimento)
    setSelectedCantidad(alimento.porcion_tipica_g || 100)
    setSearchQuery("")
    setSearchResults([])
  }, [])

  const handleAddAlimento = useCallback(() => {
    if (!selectedAlimento) return
    const item = alimentoToReviewItem(selectedAlimento, selectedCantidad)
    setReviewItems((prev) => [...prev, item])
    setSelectedAlimento(null)
    setSelectedCantidad(100)
  }, [selectedAlimento, selectedCantidad])

  const handleContinueToReview = useCallback(() => {
    if (reviewItems.length === 0) return
    setOrigen("manual")
    // Auto-generate name from items
    if (!reviewNombre) {
      setReviewNombre(reviewItems.map((i) => i.nombre).join(", "))
    }
    setStep("review")
  }, [reviewItems, reviewNombre])

  // -------------------------------------------------------------------------
  // Review: update quantity
  // -------------------------------------------------------------------------

  const handleQuantityChange = useCallback((index: number, newG: number) => {
    setReviewItems((prev) =>
      prev.map((item, i) => (i === index ? recalcItem(item, newG) : item))
    )
  }, [])

  const handleRemoveItem = useCallback((index: number) => {
    setReviewItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (reviewItems.length === 0) return
    setSaving(true)
    setSaveError(null)
    const totals = sumItems(reviewItems)
    try {
      const res = await fetch("/api/locus/nutricion/comidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          momento,
          nombre: reviewNombre || "Comida",
          calorias_total: totals.calorias,
          proteinas_total: totals.proteinas,
          carbohidratos_total: totals.carbohidratos,
          grasas_total: totals.grasas,
          fibra_total: totals.fibra,
          origen,
          items: reviewItems.map((i) => ({
            nombre: i.nombre,
            cantidad_g: i.cantidad_g,
            calorias: i.calorias,
            proteinas_g: i.proteinas_g,
            carbohidratos_g: i.carbohidratos_g,
            grasas_g: i.grasas_g,
            fibra_g: i.fibra_g,
            alimento_id: i.alimento_id,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al guardar")
      }
      const savedMeal = await res.json()
      // Upload photo if present
      if (photoFile && savedMeal.id) {
        try {
          const formData = new FormData()
          formData.append("file", photoFile)
          await fetch(`/api/locus/nutricion/comidas/${savedMeal.id}/foto`, {
            method: "POST",
            body: formData,
          })
        } catch {
          // Photo upload failure is non-critical
        }
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setSaveError(err.message || "Error inesperado")
    } finally {
      setSaving(false)
    }
  }, [reviewItems, fecha, momento, reviewNombre, origen, onSaved, onClose])

  // -------------------------------------------------------------------------
  // Close on backdrop click
  // -------------------------------------------------------------------------

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose()
    },
    [onClose]
  )

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const totals = sumItems(reviewItems)
  const TABS: { key: Tab; label: string }[] = [
    { key: "texto", label: "Texto libre" },
    { key: "buscar", label: "Buscar" },
    { key: "foto", label: "Foto" },
  ]

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between sticky top-0 z-10 bg-white/90 backdrop-blur-md rounded-t-2xl">
          <h2 className="text-sm font-medium text-zinc-700">
            {step === "review" ? "Revisar comida" : `Agregar ${MOMENTO_LABELS[momento]}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === "input" ? (
            <>
              {/* Tab pills */}
              <div className="flex gap-1 mb-4 p-0.5 rounded-xl bg-zinc-100/80">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${
                      tab === t.key
                        ? "bg-white text-zinc-700 shadow-sm font-medium"
                        : "text-zinc-400 hover:text-zinc-500"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Texto libre */}
              {tab === "texto" && (
                <div className="space-y-3">
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Describi tu comida... ej: milanesa con pure y ensalada"
                    className="w-full h-28 rounded-xl border border-zinc-200 p-3 text-sm text-zinc-700 placeholder:text-zinc-300 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                    maxLength={500}
                  />
                  {parseError && (
                    <p className="text-xs text-red-500">{parseError}</p>
                  )}
                  <button
                    onClick={handleParsear}
                    disabled={!texto.trim() || parsing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
                    style={{ background: "#10b981" }}
                  >
                    {parsing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Analizar con IA
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Tab 2: Buscar alimento */}
              {tab === "buscar" && (
                <div className="space-y-3">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar alimento..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-700 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-300" />
                    )}
                  </div>

                  {/* Search results dropdown */}
                  {searchResults.length > 0 && !selectedAlimento && (
                    <div
                      className="rounded-xl border border-zinc-100 overflow-hidden max-h-48 overflow-y-auto"
                      style={{ background: "rgba(255,255,255,0.9)" }}
                    >
                      {searchResults.map((alimento) => (
                        <button
                          key={alimento.id}
                          onClick={() => handleSelectAlimento(alimento)}
                          className="w-full text-left px-3 py-2 hover:bg-emerald-50/50 transition-colors border-b border-zinc-50 last:border-0"
                        >
                          <span className="text-sm text-zinc-700">{alimento.nombre}</span>
                          <span className="text-[11px] text-zinc-400 ml-2">
                            {Math.round(alimento.calorias_100g)} cal/100g
                          </span>
                          {alimento.categoria && (
                            <span className="text-[10px] text-zinc-300 ml-1">
                              ({alimento.categoria})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected alimento: portion input */}
                  {selectedAlimento && (
                    <div
                      className="rounded-xl p-3 space-y-3"
                      style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-700">
                          {selectedAlimento.nombre}
                        </span>
                        <button
                          onClick={() => setSelectedAlimento(null)}
                          className="p-0.5 rounded hover:bg-zinc-100"
                        >
                          <X className="w-3 h-3 text-zinc-400" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-zinc-500">Cantidad:</label>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedCantidad((c) => Math.max(10, c - 10))}
                            className="p-1 rounded-lg hover:bg-white/80 transition-colors"
                          >
                            <Minus className="w-3 h-3 text-zinc-400" />
                          </button>
                          <input
                            type="number"
                            value={selectedCantidad}
                            onChange={(e) => setSelectedCantidad(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-16 text-center text-sm rounded-lg border border-zinc-200 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                          />
                          <button
                            onClick={() => setSelectedCantidad((c) => c + 10)}
                            className="p-1 rounded-lg hover:bg-white/80 transition-colors"
                          >
                            <Plus className="w-3 h-3 text-zinc-400" />
                          </button>
                          <span className="text-xs text-zinc-400 ml-1">g</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {Math.round(selectedAlimento.calorias_100g * selectedCantidad / 100)} kcal
                        {" / "}
                        P: {Math.round(selectedAlimento.proteinas_100g * selectedCantidad / 100)}g
                        {" C: "}{Math.round(selectedAlimento.carbohidratos_100g * selectedCantidad / 100)}g
                        {" G: "}{Math.round(selectedAlimento.grasas_100g * selectedCantidad / 100)}g
                      </div>
                      <button
                        onClick={handleAddAlimento}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-white transition-all"
                        style={{ background: "#10b981" }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar
                      </button>
                    </div>
                  )}

                  {/* Added items list */}
                  {reviewItems.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                        Alimentos agregados
                      </span>
                      <div className="rounded-xl border border-zinc-100 overflow-hidden">
                        {reviewItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-3 py-2 border-b border-zinc-50 last:border-0"
                          >
                            <div>
                              <span className="text-sm text-zinc-700">{item.nombre}</span>
                              <span className="text-[11px] text-zinc-400 ml-2">
                                {item.cantidad_g}g - {item.calorias} kcal
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3 h-3 text-zinc-300 hover:text-red-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleContinueToReview}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                        style={{ background: "#10b981" }}
                      >
                        Continuar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Foto */}
              {tab === "foto" && (
                <div className="space-y-3">
                  {!photoPreview ? (
                    <label className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-emerald-300 transition-colors">
                      <Camera className="w-8 h-8 text-zinc-300 mb-2" />
                      <span className="text-sm text-zinc-400">Toca para tomar o elegir foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setPhotoFile(file)
                            setPhotoPreview(URL.createObjectURL(file))
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full rounded-xl object-cover max-h-64"
                      />
                      <button
                        onClick={() => {
                          setPhotoFile(null)
                          setPhotoPreview(null)
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-zinc-400 text-center">
                    La foto se adjunta a la comida despues de guardarla. Usa las otras pestanas para registrar los datos nutricionales.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* ============================================================= */
            /* Review step                                                    */
            /* ============================================================= */
            <div className="space-y-4">
              {/* Back button */}
              <button
                onClick={() => setStep("input")}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                &larr; Volver a editar
              </button>

              {/* Meal name */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium block mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={reviewNombre}
                  onChange={(e) => setReviewNombre(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                />
              </div>

              {/* Items list */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium block mb-2">
                  Items
                </label>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  {reviewItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-zinc-700 truncate block">
                          {item.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          value={item.cantidad_g}
                          onChange={(e) =>
                            handleQuantityChange(idx, Math.max(1, parseInt(e.target.value) || 0))
                          }
                          className="w-14 text-center text-xs rounded-lg border border-zinc-200 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                        />
                        <span className="text-[11px] text-zinc-400">g</span>
                      </div>
                      <span className="text-xs text-zinc-500 w-14 text-right shrink-0">
                        {item.calorias} kcal
                      </span>
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded hover:bg-red-50 transition-colors shrink-0"
                      >
                        <X className="w-3 h-3 text-zinc-300 hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div
                className="rounded-xl p-3"
                style={{ background: "rgba(16,185,129,0.06)" }}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-zinc-500">Total</span>
                  <span className="text-lg font-medium" style={{ color: "#10b981" }}>
                    {Math.round(totals.calorias)} kcal
                  </span>
                </div>
                <div className="flex gap-3 text-[11px] text-zinc-400">
                  <span>P: {Math.round(totals.proteinas)}g</span>
                  <span>C: {Math.round(totals.carbohidratos)}g</span>
                  <span>G: {Math.round(totals.grasas)}g</span>
                  {totals.fibra > 0 && <span>F: {Math.round(totals.fibra)}g</span>}
                </div>
              </div>

              {/* Save error */}
              {saveError && (
                <p className="text-xs text-red-500">{saveError}</p>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving || reviewItems.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
                style={{ background: "#10b981" }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
