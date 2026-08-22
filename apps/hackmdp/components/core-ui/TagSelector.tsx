"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { Tag } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Plus, X, Tags } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Color options for tags
export const TAG_COLORS = [
  { value: "gray", label: "Gris", bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", border: "border-gray-300 dark:border-gray-600", dot: "bg-gray-500" },
  { value: "purple", label: "Violeta", bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300 dark:border-purple-600", dot: "bg-purple-500" },
  { value: "blue", label: "Azul", bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300 dark:border-blue-600", dot: "bg-blue-500" },
  { value: "green", label: "Verde", bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-700 dark:text-green-300", border: "border-green-300 dark:border-green-600", dot: "bg-green-500" },
  { value: "orange", label: "Naranja", bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", border: "border-orange-300 dark:border-orange-600", dot: "bg-orange-500" },
  { value: "red", label: "Rojo", bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300", border: "border-red-300 dark:border-red-600", dot: "bg-red-500" },
  { value: "cyan", label: "Cyan", bg: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-300 dark:border-cyan-600", dot: "bg-cyan-500" },
  { value: "pink", label: "Rosa", bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300", border: "border-pink-300 dark:border-pink-600", dot: "bg-pink-500" },
] as const;

export function getTagColorClasses(color: string) {
  return TAG_COLORS.find((c) => c.value === color) || TAG_COLORS[0];
}

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  className?: string;
}

export function TagSelector({ selectedTagIds, onChange, className }: TagSelectorProps) {
  const { data: allTags, mutate: mutateTags } = useSWR<Tag[]>("/api/tags", fetcher);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("purple");
  const inputRef = useRef<HTMLInputElement>(null);

  const tags = allTags || [];
  const filtered = tags.filter((t) =>
    t.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newTagName.trim(), color: newTagColor }),
      });

      if (!res.ok) throw new Error("Error creating tag");

      const newTag = await res.json();
      await mutateTags();
      onChange([...selectedTagIds, newTag.id]);
      setNewTagName("");
      setCreating(false);
    } catch (error) {
      console.error("Error creating tag:", error);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => {
            const colors = getTagColorClasses(tag.color);
            return (
              <Badge
                key={tag.id}
                variant="outline"
                className={cn(
                  "text-xs px-2 py-0.5 gap-1 cursor-pointer",
                  colors.bg, colors.text, colors.border
                )}
                onClick={() => removeTag(tag.id)}
              >
                {tag.nombre}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Popover trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            htmlType="button"
            type="outline"
            className="h-9 text-sm gap-2 text-muted-foreground"
          >
            <Tags className="h-4 w-4" />
            {selectedTags.length === 0 ? "Agregar tags" : "Modificar tags"}
            <ChevronDown className="h-3 w-3 ml-auto" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              placeholder="Buscar tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 && !creating && (
              <p className="text-sm text-muted-foreground text-center py-3">
                {search ? "Sin resultados" : "No hay tags"}
              </p>
            )}

            {filtered.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              const colors = getTagColorClasses(tag.color);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
                    isSelected && "bg-accent"
                  )}
                  onClick={() => toggleTag(tag.id)}
                >
                  <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", colors.dot)} />
                  <span className="flex-1 text-left truncate">{tag.nombre}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Create new tag inline */}
          <div className="border-t p-2">
            {!creating ? (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors text-muted-foreground"
                onClick={() => {
                  setCreating(true);
                  setNewTagName(search);
                }}
              >
                <Plus className="h-4 w-4" />
                Crear nuevo tag{search ? `: "${search}"` : ""}
              </button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Nombre del tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag();
                    }
                    if (e.key === "Escape") {
                      setCreating(false);
                      setNewTagName("");
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-all",
                        color.dot,
                        newTagColor === color.value
                          ? "border-foreground scale-110"
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      onClick={() => setNewTagColor(color.value)}
                      title={color.label}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button
                    htmlType="button"
                    type="primary"
                    className="h-7 text-xs flex-1"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                  >
                    Crear
                  </Button>
                  <Button
                    htmlType="button"
                    type="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setCreating(false);
                      setNewTagName("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Standalone component to display tags as badges (read-only)
export function TagBadges({ tags, className }: { tags?: Tag[]; className?: string }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((tag) => {
        const colors = getTagColorClasses(tag.color);
        return (
          <Badge
            key={tag.id}
            variant="outline"
            className={cn("text-xs px-1.5 py-0", colors.bg, colors.text, colors.border)}
          >
            {tag.nombre}
          </Badge>
        );
      })}
    </div>
  );
}
