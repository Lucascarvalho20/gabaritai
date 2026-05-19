'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import {
  LayoutDashboard, Users, BookOpen, DollarSign, BarChart3,
  Sparkles, LogOut, Sun, Moon, Menu, X, ChevronRight, Database, FileText, Megaphone
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const NAV = [
  { href: '/admin',            label: 'Visão Geral',     icon: LayoutDashboard, exact: true },
  { href: '/admin/usuarios',   label: 'Beta Testers',    icon: Users },
  { href: '/admin/cursos',     label: 'Cursos',          icon: BookOpen },
  { href: '/admin/editais',    label: 'Editais',         icon: FileText },
  { href: '/admin/planos',     label: 'Planos e Preços', icon: DollarSign },
  { href: '/admin/relatorios', label: 'Relatórios',      icon: BarChart3 },
  { href: '/admin/insights',   label: 'Insights',        icon: BarChart3 },
  { href: '/admin/conteudo',   label: 'Conteúdo do Site',icon: Sparkles },
  { href: '/admin/broadcast',  label: 'Broadcast',       icon: Megaphone },
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  function handleLogout() {
    logout()
    toast.success('Até logo!')
    router.push('/login')
  }

  // Breadcrumb atual
  const current = NAV.find(n => n.exact ? pathname === n.href : (pathname !== '/admin' && pathname.startsWith(n.href)))
    ?? NAV[0]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Logo size="md" />
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 px-2 py-1 rounded-lg">
          ⚙️ Painel Admin
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active ? 'bg-danger-600 text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <Link href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all">
          👁️ Ver como aluno
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

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-card h-full shadow-2xl">
            <SidebarContent />
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-card flex items-center gap-4 px-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors">
            <Menu className="w-4 h-4" />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:text-foreground transition-colors font-medium">Admin</Link>
            {pathname !== '/admin' && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-foreground font-medium">{current.label}</span>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link href="/dashboard" className="btn-outline btn-sm text-xs ml-2">👁️ Ver como aluno</Link>
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
