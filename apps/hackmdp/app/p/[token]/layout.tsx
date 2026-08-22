export const metadata = {
  title: 'Firmar Documento',
  description: 'Firma digital de documentos',
}

export default function PublicSignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6">
        {children}
      </main>
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-2xl px-4 py-4 text-center text-sm text-muted-foreground">
          <p>Documento protegido por firma digital. Su direccion IP y datos de acceso quedan registrados.</p>
        </div>
      </footer>
    </div>
  )
}
