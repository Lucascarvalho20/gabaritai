import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { QueryProvider } from '@/components/ui/query-provider'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'GabaritAI — Mentoria Inteligente para Concursos',
    template: '%s | GabaritAI',
  },
  description: 'Plataforma de mentoria com IA adaptativa para concursos públicos. Carreiras policiais, bancos públicos, TJDFT e muito mais. Estude de forma personalizada e aumente suas chances de aprovação.',
  keywords: ['concursos públicos', 'PMDF', 'Polícia Federal', 'Banco do Brasil', 'TJDFT', 'CNU', 'mentoria IA', 'flashcards', 'simulados'],
  authors: [{ name: 'GabaritAI' }],
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'GabaritAI',
    title: 'GabaritAI — Mentoria Inteligente para Concursos',
    description: 'Estude de forma personalizada com IA adaptativa e aumente suas chances de aprovação.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GabaritAI',
    description: 'Mentoria inteligente para concursos públicos.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1e' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { borderRadius: '12px', fontSize: '14px' },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
