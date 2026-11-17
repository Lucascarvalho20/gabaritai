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

        {/* Só o que dá para conferir: nada de depoimento ou número inventado. */}
        <div className="relative flex-1 flex flex-col justify-center">
          <div className="space-y-4">
            <p className="text-2xl font-bold text-white leading-snug">
              Quanto o edital pede, quanto tempo você tem, e as provas que a banca já aplicou.
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Calculadora do edital: o tempo que o conteúdo pede, medido na plataforma</li>
              <li>• Provas oficiais anteriores, com o tempo do edital e o gabarito definitivo</li>
              <li>• Cronograma com revisões espaçadas e blocos de foco</li>
            </ul>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[['12', 'Cargos com curso'], ['7 dias', 'Grátis para testar'], ['15 dias', 'De garantia'], ['24/7', 'Mentor IA']].map(([v, l]) => (
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
