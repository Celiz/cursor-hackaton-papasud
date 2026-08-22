/**
 * Sube un archivo a /api/upload y devuelve su URL pública en media.aeterna.red.
 * Compartido por todo lo que adjunta archivos en instalaciones.
 */
export async function subirArchivo(file: File, bucket: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('bucket', bucket);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('No se pudo subir el archivo');
  const { url } = await res.json();
  return url;
}
