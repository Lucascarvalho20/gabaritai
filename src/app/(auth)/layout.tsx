import { Logo } from '@/components/ui/logo'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700 relative overflow-hidden p-10">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative">
          <Logo size="lg" linkTo="/" />
        </div>

        <div className="relative flex-1 flex flex-col justify-center">
          <blockquote className="space-y-4">
            <p className="text-2xl font-bold text-white leading-snug">
              "Em 4 meses usando o GabaritAI passei do zero para aprovado no PMDF. A IA sabia exatamente onde eu precisava melhorar."
            </p>
            <footer className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                LM
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Lucas Mendonça</div>
                <div className="text-green-400 text-xs font-medium">Aprovado — PMDF 2024</div>
              </div>
            </footer>
          </blockquote>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[['12.400+', 'Aprovados'], ['94%', 'Satisfação'], ['7 dias', 'Grátis para testar'], ['24/7', 'Mentor IA']].map(([v, l]) => (
              <div key={l} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-2xl font-black text-white">{v}</div>
                <div className="text-xs text-gray-400 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-gray-500">© 2024 GabaritAI · Todos os direitos reservados</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-10 bg-background">
        <div className="lg:hidden mb-8">
          <Logo size="lg" />
        </div>
        <div className="w-full max-w-md">
          {children}
        </div>
        <p className="mt-8 text-xs text-muted-foreground text-center">
          Ao continuar, você concorda com nossos{' '}
          <Link href="/termos" className="underline hover:text-foreground">Termos de Uso</Link>
          {' '}e{' '}
          <Link href="/privacidade" className="underline hover:text-foreground">Política de Privacidade</Link>
        </p>
      </div>
    </div>
  )
}
