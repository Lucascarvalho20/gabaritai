import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { QueryProvider } from '@/components/ui/query-provider'
import { PWARegister } from '@/components/pwa-register'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Gabaritai — Mentoria de estudos para concursos',
    template: '%s | Gabaritai',
  },
  description: 'Plataforma de mentoria para concursos militares e policiais. Cronograma adaptativo, simulados reais cronometrados e edital verticalizado para acelerar sua aprovação.',
  keywords: ['concursos públicos', 'PMDF', 'Polícia Federal', 'PRF', 'PCDF', 'TJDFT', 'CNU', 'mentoria concursos', 'flashcards', 'simulados', 'edital verticalizado'],
  authors: [{ name: 'Gabaritai' }],
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Gabaritai',
    title: 'Gabaritai — Mentoria de estudos para concursos',
    description: 'Cronograma adaptativo, simulados reais e edital verticalizado para acelerar sua aprovação.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gabaritai',
    description: 'Mentoria de estudos para concursos militares e policiais.',
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
            <PWARegister />
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
