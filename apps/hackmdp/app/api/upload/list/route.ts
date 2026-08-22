import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readdir } from 'fs/promises';
import path from 'path';

export const revalidate = 0;

const IS_DEV = process.env.NODE_ENV !== 'production';
const MEDIA_ROOT = process.env.MEDIA_ROOT
  || (IS_DEV ? path.join(process.cwd(), 'public', 'uploads') : '/home/aeterna/data/media');
const MEDIA_URL = process.env.MEDIA_URL
  || (IS_DEV ? '/uploads' : 'https://media.aeterna.red');

/**
 * GET /api/upload/list?bucket=email
 * Lista las imágenes subidas de un bucket (historial del asset manager).
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.org_id || !session.org_slug) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const bucket = new URL(request.url).searchParams.get('bucket') || 'email';
  const dir = path.join(MEDIA_ROOT, session.org_slug, 'escuela', bucket);
  try {
    const files = await readdir(dir);
    const imgs = files
      .filter((f) => /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(f))
      .sort((a, b) => (a < b ? 1 : -1)) // el filename arranca con Date.now() → más nuevas primero
      .map((f) => ({ name: f, url: `${MEDIA_URL}/${session.org_slug}/escuela/${bucket}/${f}` }));
    return NextResponse.json(imgs);
  } catch {
    return NextResponse.json([]); // la carpeta aún no existe
  }
}
