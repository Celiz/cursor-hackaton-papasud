'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import {
  Type, Image as ImageIcon, MousePointerClick, Minus, MoveVertical,
  Trash2, Copy, ArrowUp, ArrowDown, Square, Columns2, Columns3, GripVertical,
} from 'lucide-react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, useDraggable, useDroppable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EmailDoc, Section, Column, Block, BlockType, Align, newBlock, newSection,
  Preset, PRESETS,
} from '@/lib/motor/model';
import AssetManager from './AssetManager';

interface Props {
  doc: EmailDoc;
  onChange: (d: EmailDoc) => void;
}

const clone = (d: EmailDoc): EmailDoc => JSON.parse(JSON.stringify(d));

function findBlock(doc: EmailDoc, blockId: string) {
  for (const s of doc.sections)
    for (const c of s.columns) {
      const bi = c.blocks.findIndex((b) => b.id === blockId);
      if (bi >= 0) return { s, c, b: c.blocks[bi], bi };
    }
  return null;
}
function findColumn(doc: EmailDoc, colId: string): Column | null {
  for (const s of doc.sections) for (const c of s.columns) if (c.id === colId) return c;
  return null;
}

const PALETTE: { type: BlockType; label: string; icon: ReactNode }[] = [
  { type: 'text', label: 'Texto', icon: <Type className="h-5 w-5" /> },
  { type: 'image', label: 'Imagen', icon: <ImageIcon className="h-5 w-5" /> },
  { type: 'button', label: 'Botón', icon: <MousePointerClick className="h-5 w-5" /> },
  { type: 'divider', label: 'Divisor', icon: <Minus className="h-5 w-5" /> },
  { type: 'spacer', label: 'Espacio', icon: <MoveVertical className="h-5 w-5" /> },
];

export default function MotorEditor({ doc, onChange }: Props) {
  const [selId, setSelId] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [dragActive, setDragActive] = useState<{ kind: 'new'; type: BlockType } | { kind: 'block'; id: string } | null>(null);
  const [assetTarget, setAssetTarget] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const patchDoc = (fn: (d: EmailDoc) => void) => { const d = clone(doc); fn(d); onChange(d); };

  const addBlock = (type: BlockType) => {
    patchDoc((d) => {
      const loc = selId ? findBlock(d, selId) : null;
      const b = newBlock(type);
      if (loc) loc.c.blocks.splice(loc.bi + 1, 0, b);
      else d.sections[d.sections.length - 1]?.columns[0]?.blocks.push(b);
      setSelId(b.id);
    });
  };
  const addSection = (cols: number) => patchDoc((d) => d.sections.push(newSection(cols)));
  const addPreset = (p: Preset) => patchDoc((d) => {
    const secs = p.build();
    d.sections.push(...secs);
    setSelId(secs[0]?.columns[0]?.blocks[0]?.id ?? null);
  });
  const updateBlock = (id: string, patch: Partial<any>) => patchDoc((d) => { const l = findBlock(d, id); if (l) Object.assign(l.b, patch); });
  const updateSettings = (patch: Partial<EmailDoc['settings']>) => patchDoc((d) => Object.assign(d.settings, patch));
  const deleteBlock = (id: string) => { patchDoc((d) => { const l = findBlock(d, id); if (l) l.c.blocks.splice(l.bi, 1); }); if (selId === id) setSelId(null); };
  const duplicateBlock = (id: string) => patchDoc((d) => { const l = findBlock(d, id); if (l) { const copy = { ...JSON.parse(JSON.stringify(l.b)), id: Math.random().toString(36).slice(2, 9) }; l.c.blocks.splice(l.bi + 1, 0, copy); } });
  const moveBlock = (id: string, dir: -1 | 1) => patchDoc((d) => { const l = findBlock(d, id); if (!l) return; const j = l.bi + dir; if (j < 0 || j >= l.c.blocks.length) return; [l.c.blocks[l.bi], l.c.blocks[j]] = [l.c.blocks[j], l.c.blocks[l.bi]]; });

  const onDragStart = (e: DragStartEvent) => {
    const a = e.active.data.current as any;
    if (a?.kind === 'new') setDragActive({ kind: 'new', type: a.type });
    else setDragActive({ kind: 'block', id: e.active.id as string });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragActive(null);
    const { active, over } = e;
    if (!over) return;
    const a = active.data.current as any;
    const o = over.data.current as any;
    const overCol = o?.columnId as string | undefined;
    if (!overCol) return;
    const overIndex = o?.kind === 'block' ? (o.index as number) : -1;

    patchDoc((d) => {
      const t = findColumn(d, overCol);
      if (!t) return;
      if (a?.kind === 'new') {
        const b = newBlock(a.type);
        t.blocks.splice(overIndex < 0 ? t.blocks.length : overIndex, 0, b);
        setSelId(b.id);
      } else if (a?.kind === 'block') {
        const src = findBlock(d, active.id as string);
        if (!src) return;
        const [moved] = src.c.blocks.splice(src.bi, 1);
        const tc = findColumn(d, overCol)!;
        let idx = overIndex < 0 ? tc.blocks.length : overIndex;
        if (src.c.id === tc.id && src.bi < idx) idx--;
        tc.blocks.splice(idx, 0, moved);
      }
    });
  };

  const selected = selId ? findBlock(doc, selId)?.b ?? null : null;
  const contentWidth = device === 'mobile' ? 360 : 600;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragActive(null)}>
      <div className="flex h-full min-h-0 bg-[#eef0f3]">
        {/* Paleta */}
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-3">
          <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Bloques</p>
          <p className="px-1 pb-2 text-[11px] text-gray-400">Arrastrá al email o hacé click.</p>
          <div className="grid grid-cols-2 gap-2">
            {PALETTE.map((p) => <PaletteItem key={p.type} type={p.type} label={p.label} icon={p.icon} onClick={() => addBlock(p.type)} />)}
          </div>
          <p className="px-1 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">Secciones</p>
          <div className="grid grid-cols-3 gap-2">
            <PaletteBtn icon={<Square className="h-5 w-5" />} label="1" onClick={() => addSection(1)} small />
            <PaletteBtn icon={<Columns2 className="h-5 w-5" />} label="2" onClick={() => addSection(2)} small />
            <PaletteBtn icon={<Columns3 className="h-5 w-5" />} label="3" onClick={() => addSection(3)} small />
          </div>
          <p className="px-1 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">Prediseñadas</p>
          <div className="flex flex-col gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => addPreset(p)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-600 transition hover:border-blue-500 hover:bg-blue-50">
                {p.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Lienzo */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex justify-center gap-2 border-b border-gray-200 bg-white py-2">
            <button onClick={() => setDevice('desktop')} className={`rounded px-3 py-1 text-xs font-medium ${device === 'desktop' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>Escritorio</button>
            <button onClick={() => setDevice('mobile')} className={`rounded px-3 py-1 text-xs font-medium ${device === 'mobile' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>Móvil</button>
          </div>
          <div className="flex justify-center py-8" onClick={() => setSelId(null)}>
            <div style={{ width: contentWidth, maxWidth: '100%' }}>
              {doc.sections.map((s) => (
                <div key={s.id} style={{ backgroundColor: s.bg, padding: `${s.paddingV}px ${s.paddingH}px` }}>
                  <div className="flex" style={{ gap: 0 }}>
                    {s.columns.map((c) => (
                      <DroppableColumn key={c.id} column={c} selId={selId} onSelect={setSelId}
                        onText={(id, html) => updateBlock(id, { html })}
                        onMove={moveBlock} onDup={duplicateBlock} onDel={deleteBlock} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Propiedades */}
        <aside className="w-72 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4">
          {selected ? <PropsPanel block={selected} onChange={(patch) => updateBlock(selected.id, patch)} onOpenAssets={() => setAssetTarget(selected.id)} /> : <GlobalPanel settings={doc.settings} onChange={updateSettings} />}
        </aside>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragActive ? (
          <div className="rounded-lg border border-blue-500 bg-white px-3 py-2 text-xs font-medium text-blue-700 shadow-lg">
            {dragActive.kind === 'new' ? labelOf(dragActive.type) : 'Moviendo bloque'}
          </div>
        ) : null}
      </DragOverlay>

      <AssetManager
        open={!!assetTarget}
        onClose={() => setAssetTarget(null)}
        onSelect={(url) => { if (assetTarget) updateBlock(assetTarget, { src: url }); }}
      />
    </DndContext>
  );
}

// ---- Paleta ----
function PaletteItem({ type, label, icon, onClick }: { type: BlockType; label: string; icon: ReactNode; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `new-${type}`, data: { kind: 'new', type } });
  return (
    <button
      ref={setNodeRef} {...attributes} {...listeners} onClick={onClick}
      className={`flex cursor-grab flex-col items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-3 text-gray-600 transition hover:border-blue-500 hover:bg-blue-50 active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
    >
      {icon}<span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}
function PaletteBtn({ icon, label, onClick, small }: { icon: ReactNode; label: string; onClick: () => void; small?: boolean }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-blue-500 hover:bg-blue-50 ${small ? 'py-2' : 'py-3'}`}>
      {icon}<span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

// ---- Columna (droppable) + bloques (sortable) ----
function DroppableColumn({ column, selId, onSelect, onText, onMove, onDup, onDel }: {
  column: Column; selId: string | null; onSelect: (id: string) => void;
  onText: (id: string, html: string) => void; onMove: (id: string, dir: -1 | 1) => void; onDup: (id: string) => void; onDel: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.id}`, data: { kind: 'column', columnId: column.id } });
  return (
    <div ref={setNodeRef} style={{ width: `${column.width}%` }} className={isOver ? 'bg-blue-50/50 ring-1 ring-blue-300' : ''}>
      <SortableContext items={column.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        {column.blocks.length === 0 && (
          <div className="rounded border border-dashed border-gray-300 py-8 text-center text-xs text-gray-400">Soltá un bloque acá</div>
        )}
        {column.blocks.map((b, i) => (
          <SortableBlock key={b.id} block={b} index={i} columnId={column.id} selected={selId === b.id}
            onSelect={(e) => { e.stopPropagation(); onSelect(b.id); }}
            onText={(html) => onText(b.id, html)} onMove={(dir) => onMove(b.id, dir)} onDup={() => onDup(b.id)} onDel={() => onDel(b.id)} />
        ))}
      </SortableContext>
    </div>
  );
}

function SortableBlock({ block, index, columnId, selected, onSelect, onText, onMove, onDup, onDel }: {
  block: Block; index: number; columnId: string; selected: boolean; onSelect: (e: any) => void;
  onText: (html: string) => void; onMove: (dir: -1 | 1) => void; onDup: () => void; onDel: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id, data: { kind: 'block', columnId, index } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="relative" onClick={onSelect}>
      <div style={{ outline: selected ? '2px solid #2563eb' : '1px solid transparent', outlineOffset: -1, cursor: 'pointer' }}>
        {selected && (
          <div className="absolute -top-3 right-1 z-10 flex items-center gap-0.5 rounded-md bg-blue-600 px-1 py-0.5 text-white shadow" onClick={(e) => e.stopPropagation()}>
            <span {...attributes} {...listeners} title="Arrastrar" className="cursor-grab rounded p-0.5 hover:bg-white/20 active:cursor-grabbing"><GripVertical className="h-3.5 w-3.5" /></span>
            <IconBtn title="Subir" onClick={() => onMove(-1)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn title="Bajar" onClick={() => onMove(1)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn title="Duplicar" onClick={onDup}><Copy className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn title="Eliminar" onClick={onDel}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
          </div>
        )}
        <BlockInner block={block} onText={onText} />
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: ReactNode; title: string; onClick: () => void }) {
  return <button title={title} onClick={onClick} className="rounded p-0.5 hover:bg-white/20">{children}</button>;
}

function BlockInner({ block, onText }: { block: Block; onText: (html: string) => void }) {
  switch (block.type) {
    case 'text': return <TextEditable block={block} onChange={onText} />;
    case 'image': return <div style={{ textAlign: block.align }}><img src={block.src} alt={block.alt} style={{ width: block.width, maxWidth: '100%', display: 'inline-block' }} /></div>;
    case 'button': return <div style={{ textAlign: block.align, padding: '4px 0' }}><span style={{ display: 'inline-block', backgroundColor: block.bg, color: block.color, borderRadius: block.radius, fontSize: block.fontSize, padding: '12px 22px', fontWeight: 600 }}>{block.text}</span></div>;
    case 'divider': return <div style={{ padding: '4px 0' }}><div style={{ borderTop: `${block.width}px solid ${block.color}` }} /></div>;
    case 'spacer': return <div style={{ height: block.height }} />;
  }
}

function TextEditable({ block, onChange }: { block: Extract<Block, { type: 'text' }>; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.innerHTML = block.html; /* eslint-disable-next-line */ }, []);
  return <div ref={ref} contentEditable suppressContentEditableWarning onBlur={() => onChange(ref.current?.innerHTML || '')}
    style={{ fontSize: block.fontSize, color: block.color, textAlign: block.align, lineHeight: block.lineHeight, fontWeight: block.fontWeight as any, outline: 'none', padding: '2px 0' }} />;
}

// ---- Paneles ----
function PropsPanel({ block, onChange, onOpenAssets }: { block: Block; onChange: (patch: Partial<any>) => void; onOpenAssets: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-800">{labelOf(block.type)}</p>
      {(block.type === 'text' || block.type === 'button') && <AlignField value={block.align} onChange={(align) => onChange({ align })} />}
      {block.type === 'text' && <>
        <NumField label="Tamaño" value={block.fontSize} onChange={(fontSize) => onChange({ fontSize })} />
        <ColorField label="Color" value={block.color} onChange={(color) => onChange({ color })} />
        <SelectField label="Peso" value={block.fontWeight} options={[['400', 'Normal'], ['600', 'Semi'], ['700', 'Negrita'], ['800', 'Extra']]} onChange={(fontWeight) => onChange({ fontWeight })} />
      </>}
      {block.type === 'image' && <>
        <button onClick={onOpenAssets} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Elegir / subir imagen</button>
        <TextField label="URL de imagen" value={block.src} onChange={(src) => onChange({ src })} />
        <TextField label="Texto alternativo" value={block.alt} onChange={(alt) => onChange({ alt })} />
        <NumField label="Ancho (px)" value={block.width} onChange={(width) => onChange({ width })} />
        <TextField label="Link (opcional)" value={block.href} onChange={(href) => onChange({ href })} />
      </>}
      {block.type === 'button' && <>
        <TextField label="Texto" value={block.text} onChange={(text) => onChange({ text })} />
        <TextField label="Link" value={block.href} onChange={(href) => onChange({ href })} />
        <ColorField label="Fondo" value={block.bg} onChange={(bg) => onChange({ bg })} />
        <ColorField label="Texto" value={block.color} onChange={(color) => onChange({ color })} />
        <NumField label="Radio" value={block.radius} onChange={(radius) => onChange({ radius })} />
      </>}
      {block.type === 'divider' && <>
        <ColorField label="Color" value={block.color} onChange={(color) => onChange({ color })} />
        <NumField label="Grosor" value={block.width} onChange={(width) => onChange({ width })} />
      </>}
      {block.type === 'spacer' && <NumField label="Alto (px)" value={block.height} onChange={(height) => onChange({ height })} />}
    </div>
  );
}
function GlobalPanel({ settings, onChange }: { settings: EmailDoc['settings']; onChange: (patch: Partial<EmailDoc['settings']>) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-800">Estilos del email</p>
      <p className="text-xs text-gray-500">Seleccioná un bloque para editarlo, o ajustá el estilo general acá.</p>
      <ColorField label="Fondo del email" value={settings.bodyBg} onChange={(bodyBg) => onChange({ bodyBg })} />
      <SelectField label="Fuente" value={settings.font} options={[['Arial', 'Arial'], ['Helvetica', 'Helvetica'], ['Georgia', 'Georgia'], ['Verdana', 'Verdana'], ['Tahoma', 'Tahoma']]} onChange={(font) => onChange({ font })} />
      <ColorField label="Color de texto" value={settings.textColor} onChange={(textColor) => onChange({ textColor })} />
      <ColorField label="Color de enlaces" value={settings.linkColor} onChange={(linkColor) => onChange({ linkColor })} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm text-gray-700"><span>{label}</span>{children}</label>;
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <Row label={label}><input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-11 cursor-pointer rounded border border-gray-300 bg-white p-0.5" /></Row>;
}
function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <Row label={label}><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-8 w-20 rounded border border-gray-300 px-2 text-sm" /></Row>;
}
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1"><span className="text-xs text-gray-500">{label}</span><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded border border-gray-300 px-2 text-sm" /></div>;
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return <Row label={label}><select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded border border-gray-300 bg-white px-2 text-sm">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Row>;
}
function AlignField({ value, onChange }: { value: Align; onChange: (v: Align) => void }) {
  return <Row label="Alineación"><div className="flex gap-1">{(['left', 'center', 'right'] as Align[]).map((a) => <button key={a} onClick={() => onChange(a)} className={`rounded px-2 py-1 text-xs ${value === a ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{a === 'left' ? 'Izq' : a === 'center' ? 'Centro' : 'Der'}</button>)}</div></Row>;
}

function labelOf(t: BlockType) { return { text: 'Texto', image: 'Imagen', button: 'Botón', divider: 'Divisor', spacer: 'Espacio' }[t]; }
