'use client'

import { motion } from 'framer-motion'
import { Bell, BellRing, CalendarClock, Mail, MessageCircle, Smartphone } from 'lucide-react'
import { Reveal, StaggerGroup, StaggerItem } from '@/lib/motion-helpers'

/**
 * Seção da landing dedicada aos lembretes/notificações.
 * Concurseiro vive em modo "tô atrasado". A diferença entre quem mantém
 * a rotina e quem larga é, frequentemente, lembrete no momento certo.
 *
 * Mostra:
 *  - 4 tipos de lembrete que o sistema envia
 *  - Por qual canal (email, push, navegador)
 *  - Mock de uma notificação push real
 */

const LEMBRETES = [
  {
    icon: CalendarClock,
    titulo: 'Início do estudo',
    desc: 'Seu bloco de estudo é 7h da manhã? Lembrete 5 min antes. Bateu o horário e você não abriu o cronograma? Lembrete na hora.',
    cor: 'text-brand-600 dark:text-brand-400',
    bg: 'bg-brand-500/10',
  },
  {
    icon: BellRing,
    titulo: 'Revisão SRS atrasada',
    desc: 'Tem flashcard pra revisar e você esqueceu? "Você tem 18 cards de Direito Penal aguardando." Toque uma vez ao dia, no horário que combinar.',
    cor: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Bell,
    titulo: 'Simulado do domingo',
    desc: 'Sábado à noite a gente avisa. Domingo cedo, lembrete 30 min antes. Sem deixar pular semana.',
    cor: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Mail,
    titulo: 'Edital atualizado',
    desc: 'Saiu edital novo do seu cargo? Email automático: "matéria X entrou, Y saiu, seu cronograma já se ajustou".',
    cor: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
]

export function RemindersSection() {
  return (
    <section className="py-16 sm:py-20 bg-muted/30 border-y border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-200/60 dark:border-purple-800/40 bg-purple-50/60 dark:bg-purple-900/15 text-purple-700 dark:text-purple-300 text-xs font-semibold mb-4">
            <BellRing className="w-3.5 h-3.5" /> Pra quem esquece de estudar
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Lembretes que te mantêm na rota
          </h2>
          <p className="mt-3 text-muted-foreground text-base leading-relaxed">
            A diferença entre quem é aprovado e quem desiste, várias vezes, é
            <strong className="text-foreground"> simplesmente lembrar de estudar</strong>. A gente cuida disso por você.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Esquerda: lista de tipos */}
          <StaggerGroup className="space-y-3">
            {LEMBRETES.map((l, i) => {
              const Icon = l.icon
              return (
                <StaggerItem key={i}>
                  <div className="card p-4 flex gap-3 items-start hover:border-brand-500/40 transition-colors">
                    <div className={`w-10 h-10 rounded-xl ${l.bg} ${l.cor} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-0.5">{l.titulo}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">{l.desc}</div>
                    </div>
                  </div>
                </StaggerItem>
              )
            })}
          </StaggerGroup>

          {/* Direita: mock de notificação push */}
          <Reveal>
            <div className="relative">
              {/* Phone-ish frame */}
              <div className="mx-auto max-w-xs aspect-[9/16] rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-700 p-3 shadow-2xl">
                <div className="h-full rounded-[2rem] bg-gradient-to-br from-brand-500/10 via-purple-500/10 to-emerald-500/10 relative overflow-hidden">
                  {/* Status bar */}
                  <div className="absolute top-0 inset-x-0 h-8 flex items-center justify-between px-6 text-[10px] font-semibold text-white/80">
                    <span>06:55</span>
                    <span>● ● ● 95</span>
                  </div>
                  {/* "Wallpaper" empty */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 text-[10px]">
                    <span className="text-4xl font-bold mb-2">07:00</span>
                    <span>Quinta · 27 mai</span>
                  </div>
                  {/* Notification stack */}
                  <div className="absolute inset-x-3 bottom-20 space-y-2">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="rounded-2xl bg-white/95 dark:bg-card/95 backdrop-blur p-3 shadow-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded bg-brand-500 flex items-center justify-center">
                          <Smartphone className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gabaritai · agora</span>
                      </div>
                      <div className="text-xs font-bold leading-tight">Bom dia, hora do estudo</div>
                      <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        Plano de hoje: Princípios Fundamentais + mini-simulado · 2h15
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className="rounded-2xl bg-white/95 dark:bg-card/95 backdrop-blur p-3 shadow-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center">
                          <BellRing className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revisão · 7h</span>
                      </div>
                      <div className="text-xs font-bold leading-tight">18 flashcards atrasados</div>
                      <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        Direito Penal · Crimes contra a pessoa
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Glow atrás do telefone */}
              <div aria-hidden className="absolute inset-0 -z-10 blur-3xl">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-brand-500/30 rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-purple-500/30 rounded-full" />
              </div>
            </div>
          </Reveal>
        </div>

        {/* Canais disponíveis */}
        <Reveal className="mt-12 text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Você escolhe por onde recebe
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {[
              { icon: Mail, label: 'Email diário' },
              { icon: Smartphone, label: 'Push no celular (PWA)' },
              { icon: Bell, label: 'Push no navegador' },
              { icon: MessageCircle, label: 'WhatsApp em breve' },
            ].map((c) => {
              const Icon = c.icon
              return (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium"
                >
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  {c.label}
                </span>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
