import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const IS_DEV = process.env.NODE_ENV !== 'production'
const MEDIA_ROOT = process.env.MEDIA_ROOT
  || (IS_DEV ? path.join(process.cwd(), 'public', 'uploads') : '/home/aeterna/data/media')
const MEDIA_URL = process.env.MEDIA_URL
  || (IS_DEV ? '/uploads' : 'https://media.aeterna.red')

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.org_id || !session.org_slug) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  const bucket = (formData.get('bucket') as string) || 'content'

  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const uploadDir = path.join(MEDIA_ROOT, session.org_slug, 'escuela', bucket)

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  const url = `${MEDIA_URL}/${session.org_slug}/escuela/${bucket}/${filename}`
  return NextResponse.json({ url })
}
