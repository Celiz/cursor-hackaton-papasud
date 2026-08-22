"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmailTemplate } from "@/app/dashboard/email-marketing/templates/columns"
import { Code, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { sheetClasses } from "@/lib/design-system"

interface EmailTemplatePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: EmailTemplate | null
}

export function EmailTemplatePreviewDialog({
  open,
  onOpenChange,
  template,
}: EmailTemplatePreviewDialogProps) {
  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{template.nombre}</DialogTitle>
            {template.categoria && (
              <Badge variant="outline">{template.categoria}</Badge>
            )}
          </div>
          {template.descripcion && (
            <DialogDescription>{template.descripcion}</DialogDescription>
          )}
          {template.asunto && (
            <div className="text-sm text-muted-foreground mt-2">
              <strong>Asunto:</strong> {template.asunto}
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className={cn(sheetClasses.tabsList, "grid-cols-2")}>
            <TabsTrigger value="preview" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
              <Eye className="w-4 h-4" />
              <span className="text-sm">Vista Previa</span>
            </TabsTrigger>
            <TabsTrigger value="code" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
              <Code className="w-4 h-4" />
              <span className="text-sm">Código HTML</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-0 p-4 max-h-[60vh] overflow-auto border rounded-md bg-white">
            <div dangerouslySetInnerHTML={{ __html: template.html_content }} />
          </TabsContent>

          <TabsContent value="code" className="mt-0 p-4 max-h-[60vh] overflow-auto">
            <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
              <code>{template.html_content}</code>
            </pre>
          </TabsContent>
        </Tabs>

        <div className="text-xs text-muted-foreground mt-4">
          <p><strong>Última modificación:</strong> {new Date(template.updated_at).toLocaleString('es-AR')}</p>
          {template.es_predefinido && (
            <p className="text-amber-600 mt-1">⚠️ Template predefinido - no se puede eliminar</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
