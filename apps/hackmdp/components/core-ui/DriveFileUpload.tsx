'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileIcon, ExternalLink, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';

interface DriveFile {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_description?: string | null;
  google_file_id: string;
  google_web_view_link?: string | null;
  google_web_content_link?: string | null;
  created_at: string;
  metadata?: Record<string, any>;
}

interface DriveFileUploadProps {
  entityType: 'servicio_tecnico' | 'equipo' | 'contrato' | 'cliente';
  entityId: number;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  onUploadComplete?: (file: DriveFile) => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar archivos');
  return Array.isArray(data) ? data : [];
};

export default function DriveFileUpload({
  entityType,
  entityId,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
  maxSize = 10,
  multiple = true,
  onUploadComplete,
}: DriveFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const { data: files, error } = useSWR<DriveFile[]>(
    `/api/google/drive/files?entityType=${entityType}&entityId=${entityId}`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress('');

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Validate file size
        if (file.size > maxSize * 1024 * 1024) {
          toast.error(`${file.name} excede el tamaño máximo de ${maxSize}MB`);
          continue;
        }

        setUploadProgress(`Subiendo ${file.name} (${i + 1}/${selectedFiles.length})...`);

        // Convert to base64
        const base64 = await fileToBase64(file);

        // Get metadata (location if available)
        const metadata: Record<string, any> = {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        };

        // Try to get location
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                maximumAge: 60000,
              });
            });
            metadata.location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
          } catch (err) {
            // Ignore geolocation errors
          }
        }

        // Upload to Drive
        const res = await fetch('/api/google/drive/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType,
            entityId,
            fileName: file.name,
            fileData: base64,
            description: `Archivo subido desde ${entityType}`,
            metadata,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || `Error al subir ${file.name}`);
        }

        if (onUploadComplete) {
          onUploadComplete(data);
        }
      }

      toast.success(
        selectedFiles.length === 1
          ? 'Archivo subido correctamente'
          : `${selectedFiles.length} archivos subidos correctamente`
      );

      // Refresh files list
      mutate(`/api/google/drive/files?entityType=${entityType}&entityId=${entityId}`);
    } catch (error: any) {
      toast.error(error.message || 'Error al subir archivos');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async (syncId: number, fileName: string) => {
    if (!confirm(`¿Eliminar ${fileName}?`)) return;

    try {
      const res = await fetch(`/api/google/drive/files?syncId=${syncId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al eliminar archivo');
      }

      toast.success('Archivo eliminado correctamente');
      mutate(`/api/google/drive/files?entityType=${entityType}&entityId=${entityId}`);
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar archivo');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          onClick={handleFileSelect}
          disabled={isUploading}
          variant="outline"
          className="flex-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {uploadProgress || 'Subiendo...'}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Subir a Google Drive
            </>
          )}
        </Button>
      </div>

      {/* Files List */}
      {error && (
        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          <p className="text-red-600">{error.message}</p>
          <p className="text-xs mt-1">Verifica que hayas conectado Google Drive en Configuración</p>
        </div>
      )}

      {!error && files && files.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
          <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay archivos subidos</p>
          <p className="text-xs mt-1">Sube archivos a Google Drive para acceder desde cualquier lugar</p>
        </div>
      )}

      {!error && files && files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Archivos en Drive ({files.length})</p>
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">{getFileIcon(file.file_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(file.file_size)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {file.google_web_view_link && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(file.google_web_view_link!, '_blank')}
                        title="Abrir en Drive"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteFile(file.id, file.file_name)}
                      title="Eliminar"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
