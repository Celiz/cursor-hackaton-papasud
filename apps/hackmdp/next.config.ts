import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // El dev server se expone por túnel de Cloudflare para demos desde otra máquina
  // (el dictado por voz necesita HTTPS: Chrome no da micrófono en contexto inseguro).
  allowedDevOrigins: ['*.trycloudflare.com', '*.lhr.life', '*.serveo.net'],
  basePath: process.env.BASE_PATH || '',
  transpilePackages: [
    '@locus/core', '@studio/email-core', '@studio/erp-core', '@locus/db',
    '@locus/ui',
    '@studio/fiscal',
  ],
  serverExternalPackages: ['pg', 'pg-pool', 'twilio', 'bcryptjs', 'nodemailer'],
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    resolveAlias: {
      // Stub Node.js built-ins that leak into client bundles via vetlab-core
      net: { browser: './lib/stubs/empty.js' },
      tls: { browser: './lib/stubs/empty.js' },
      dns: { browser: './lib/stubs/empty.js' },
      fs: { browser: './lib/stubs/empty.js' },
      twilio: { browser: './lib/stubs/empty.js' },
    },
  },
}

export default nextConfig
