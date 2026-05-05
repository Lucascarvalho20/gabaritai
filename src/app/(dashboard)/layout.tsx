'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Calendar, BookOpen, Zap, Target, Brain,
  TrendingUp, Settings, LogOut, Menu, X,
  Bell, Sun, Moon, Users, DollarSign, BarChart3
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/store/auth'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const NAV_ALUNO = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/cronograma', label: 'Cronograma', icon: Calendar },
  { href: '/dashboard/questoes', label: 'Questões', icon: BookOpen },
  { href: '/dashboard/flashcards', label: 'Flashcards', icon: Zap },
  { href: '/dashboard/simulados', label: 'Simulados', icon: Target },
  { href: '/dashboard/mentor', label: 'Mentor IA', icon: Brain, badge: 'IA' },
  { href: '/dashboard/progresso', label: 'Meu Progresso', icon: TrendingUp },
]

const NAV_ADMIN = [
  { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/cursos', label: 'Cursos', icon: BookOpen },
  { href: '/admin/planos', label: 'Planos e Preços', icon: DollarSign },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAdmin = user?.role === 'ADMIN'
  const navItems = isAdmin ? NAV_ADMIN : NAV_ALUNO

  useEffect(() => { setSidebarOpen(false) }, [pathname])

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
        <Link href={isAdmin ? '/admin/configuracoes' : '/dashboard/configuracoes'}
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
    <div className="flex h-screen bg-background overflow-hidden">
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
            <button className="relative p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
            </button>
            {isAdmin && (
              <Link href="/dashboard" className="btn-outline btn-sm ml-2">
                Ver como aluno
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
  )
}
