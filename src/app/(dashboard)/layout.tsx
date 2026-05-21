'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, BookOpen, Zap, Target, Brain,
  TrendingUp, Settings, LogOut, Menu, X,
  Bell, Sun, Moon, Users, DollarSign, BarChart3, Sparkles, FileText, Trophy
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/store/auth'
import { Logo } from '@/components/ui/logo'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { OnboardingTour } from '@/components/onboarding-tour'
import { OfflineIndicator } from '@/components/offline-indicator'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const NAV_ALUNO = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/meus-cursos', label: 'Meus Cursos', icon: BookOpen },
  { href: '/dashboard/cronograma', label: 'Cronograma', icon: Calendar },
  { href: '/dashboard/questoes', label: 'Questões', icon: BookOpen },
  { href: '/dashboard/flashcards', label: 'Flashcards', icon: Zap },
  { href: '/dashboard/simulados', label: 'Simulados', icon: Target },
  { href: '/dashboard/mentor', label: 'Mentor IA', icon: Brain, badge: 'IA' },
  { href: '/dashboard/resumos', label: 'Resumos IA', icon: Sparkles, badge: 'Novo' },
  { href: '/dashboard/historico', label: 'Histórico e fraquezas', icon: TrendingUp },
  { href: '/dashboard/edital-verticalizado', label: 'Edital verticalizado', icon: FileText },
  { href: '/dashboard/chat', label: 'Mensagens', icon: Sparkles },
  { href: '/dashboard/progresso', label: 'Meu progresso', icon: BarChart3 },
  { href: '/dashboard/ranking', label: 'Ranking', icon: Trophy },
]

const NAV_ADMIN = [
  { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/cursos', label: 'Cursos', icon: BookOpen },
  { href: '/admin/concursos', label: 'Concursos abertos', icon: Calendar, badge: 'API' },
  { href: '/admin/edital-changes', label: 'Mudanças em editais', icon: Calendar },
  { href: '/admin/planos', label: 'Planos e Preços', icon: DollarSign },
  { href: '/admin/pagamentos', label: 'Pagamentos', icon: DollarSign },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/admin/conteudo', label: 'Conteúdo do Site', icon: Sparkles },
  { href: '/admin/seguranca', label: 'Segurança', icon: Settings },
]

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />
  return (
    <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
      {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

function NavItem({ href, label, icon: Icon, badge, active }: { href: string; label: string; icon: any; badge?: string; active: boolean }) {
  return (
    <Link href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
        active
          ? 'bg-brand-600 text-white shadow-glow-blue'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'group-hover:text-foreground')} />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold', active ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400')}>
          {badge}
        </span>
      )}
    </Link>
  )
}

const MOCK_NOTIFICACOES = [
  { id: 1, tipo: 'alerta', titulo: 'Simulado disponível!', desc: `Novo simulado semanal disponível para você.`, lido: false, tempo: '2h', href: '/dashboard/simulados' },
  { id: 2, tipo: 'progresso', titulo: 'Meta diária atingida 🎯', desc: 'Você completou 80 questões hoje. Continue assim!', lido: false, tempo: '4h', href: '/dashboard/progresso' },
  { id: 3, tipo: 'dica', titulo: 'Dica do Mentor IA', desc: 'Você está errando 38% em Raciocínio Lógico. Revise hoje!', lido: true, tempo: '1d', href: '/dashboard/mentor' },
  { id: 4, tipo: 'progresso', titulo: 'Sequência de 12 dias! 🔥', desc: 'Parabéns! Você manteve 12 dias consecutivos de estudo.', lido: true, tempo: '2d', href: '/dashboard/progresso' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState(MOCK_NOTIFICACOES)
  const isAdmin = user?.role === 'ADMIN'
  const isAdminArea = pathname.startsWith('/admin')
  // Admin vê nav de aluno quando está em /dashboard (modo vitalício)
  const navItems = isAdmin && isAdminArea ? NAV_ADMIN : NAV_ALUNO
  const naoLidas = notifs.filter(n => !n.lido).length

  useEffect(() => { setSidebarOpen(false); setNotifOpen(false) }, [pathname])

  function handleLogout() {
    logout()
    toast.success('Até logo!')
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Logo size="md" />
      </div>

      {user && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-foreground truncate">{user.name.split(' ')[0]}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
          {!isAdmin && user.concursoAlvo && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400">
              <Target className="w-3 h-3" />
              <span className="font-medium">{user.concursoAlvo}</span>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={item.href === '/dashboard' || item.href === '/admin'
              ? pathname === item.href
              : pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <Link href="/dashboard/configuracoes"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          <Settings className="w-4 h-4" />
          Configurações
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-600/10 transition-all">
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <ImpersonationBanner />
      <OnboardingTour />
      <OfflineIndicator />
      <div className="flex flex-1 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-card h-full shadow-2xl animate-slide-in">
            <SidebarContent />
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-card flex items-center gap-4 px-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors">
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <ThemeToggle />

            {/* Sino de notificações */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="relative p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Bell className="w-4 h-4" />
                {naoLidas > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">Notificações</span>
                      {naoLidas > 0 && (
                        <button
                          onClick={() => setNotifs(ns => ns.map(n => ({ ...n, lido: true })))}
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-border max-h-80 overflow-y-auto">
                      {notifs.map(n => (
                        <Link
                          key={n.id}
                          href={n.href}
                          onClick={() => { setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, lido: true } : x)); setNotifOpen(false) }}
                          className={`block p-4 hover:bg-muted/50 transition-colors ${!n.lido ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg shrink-0">{n.tipo === 'alerta' ? '🔔' : n.tipo === 'progresso' ? '📈' : '💡'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">{n.titulo}</span>
                                {!n.lido && <span className="w-1.5 h-1.5 bg-brand-500 rounded-full shrink-0" />}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.desc}</p>
                              <span className="text-xs text-muted-foreground/60 mt-1 block">{n.tempo} atrás</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="p-3 border-t border-border">
                      <Link href="/dashboard/configuracoes" onClick={() => setNotifOpen(false)}
                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline block text-center">
                        Gerenciar notificações
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {isAdmin && isAdminArea && (
              <Link href="/dashboard" className="btn-outline btn-sm ml-2">
                👁️ Ver como aluno
              </Link>
            )}
            {isAdmin && !isAdminArea && (
              <Link href="/admin" className="btn-primary btn-sm ml-2">
                ⚙️ Painel Admin
              </Link>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-hide">
          {children}
        </main>
      </div>
      </div>
    </div>
  )
}
