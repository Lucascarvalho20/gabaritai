/**
 * Seed script para popular os 6 planos novos da estrutura
 * "1 curso / 2 cursos / Todos" × "Mensal / Anual" + Trial.
 *
 * Rode com:
 *   npx tsx prisma/seed-plans.ts
 *
 * Idempotente: usa upsert por slug — pode rodar várias vezes sem
 * duplicar. Atualiza valores caso já existam (útil quando ajusta
 * preço e quer propagar pra produção).
 *
 * Os slugs aqui DEVEM bater com os usados no /checkout/[slug] e
 * com os referenciados na landing (src/app/page.tsx PLANOS).
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type SeedPlan = {
  slug: string
  name: string
  description: string
  type: 'TRIAL' | 'SINGLE_COURSE' | 'COMBO' | 'FULL_ACCESS'
  interval: 'TRIAL' | 'MONTH' | 'YEAR'
  priceCents: number
  pixDiscount: number
  moneyBackDays: number
  coverageType: 'SPECIFIC' | 'AREA' | 'ALL'
  maxCourses: number | null
  features: string[]
  badge: string | null
  isVisible: boolean
  sortOrder: number
}

const PLANS: SeedPlan[] = [
  // ── TRIAL ──────────────────────────────────────────────────────────────
  {
    slug: 'trial-7-dias',
    name: 'Trial 7 dias',
    description: 'Conhece a plataforma sem cartão · 1 curso · 30 questões por dia',
    type: 'TRIAL',
    interval: 'TRIAL',
    priceCents: 0,
    pixDiscount: 0,
    moneyBackDays: 0,
    coverageType: 'SPECIFIC',
    maxCourses: 1,
    features: [
      '1 curso à escolha',
      '7 dias completos pra explorar',
      'Cronograma adaptativo completo',
      'Mentor 24h',
      'Mini-simulados liberados',
      'Limite de 30 questões por dia',
      'Simulado completo da banca: só após assinar',
      'Sem cartão de crédito',
    ],
    badge: null,
    isVisible: true,
    sortOrder: 0,
  },

  // ── MENSAL ─────────────────────────────────────────────────────────────
  {
    slug: 'mensal-1-curso',
    name: 'Mensal · 1 curso',
    description: 'Pra quem foca num cargo só (com troca livre)',
    type: 'SINGLE_COURSE',
    interval: 'MONTH',
    priceCents: 2499, // R$ 24,99
    pixDiscount: 5,
    moneyBackDays: 7,
    coverageType: 'SPECIFIC',
    maxCourses: 1,
    features: [
      '1 curso ativo por vez',
      'Troca de concurso quando quiser',
      'Cronograma adaptativo',
      'Mentor 24h',
      '3 simulados por semana',
      'Flashcards SRS',
      'Correção de redação',
    ],
    badge: null,
    isVisible: true,
    sortOrder: 10,
  },
  {
    slug: 'mensal-2-cursos',
    name: 'Mensal · 2 cursos',
    description: 'Pra quem está prestando 2 concursos juntos',
    type: 'COMBO',
    interval: 'MONTH',
    priceCents: 3999, // R$ 39,99
    pixDiscount: 5,
    moneyBackDays: 7,
    coverageType: 'SPECIFIC',
    maxCourses: 2,
    features: [
      'Até 2 cursos ativos ao mesmo tempo',
      'Troca livre entre eles',
      'Tudo do plano de 1 curso',
      'Cronograma único integrado',
      'Simulados de ambos os concursos',
    ],
    badge: 'Mais escolhido',
    isVisible: true,
    sortOrder: 20,
  },
  {
    slug: 'mensal-todos',
    name: 'Mensal · Todos os cursos',
    description: 'Acesso completo · sem limite de cargo',
    type: 'FULL_ACCESS',
    interval: 'MONTH',
    priceCents: 8999, // R$ 89,99
    pixDiscount: 5,
    moneyBackDays: 7,
    coverageType: 'ALL',
    maxCourses: null,
    features: [
      'TODOS os cursos da plataforma',
      'Sem limite de cursos ativos',
      'Tudo dos planos anteriores',
      'Acesso automático a edital novo',
      'Suporte prioritário',
      'Comunidade VIP',
    ],
    badge: null,
    isVisible: true,
    sortOrder: 30,
  },

  // ── ANUAL ──────────────────────────────────────────────────────────────
  {
    slug: 'anual-1-curso',
    name: 'Anual · 1 curso',
    description: 'Pra quem foca num cargo só · economize 34%',
    type: 'SINGLE_COURSE',
    interval: 'YEAR',
    priceCents: 19700, // R$ 197,00
    pixDiscount: 5,
    moneyBackDays: 7,
    coverageType: 'SPECIFIC',
    maxCourses: 1,
    features: [
      '1 curso ativo por vez',
      'Troca de concurso quando quiser',
      'Tudo do mensal',
      'Acesso a edital novo automático',
      'Suporte prioritário',
      'Economia de 34% vs mensal',
    ],
    badge: null,
    isVisible: true,
    sortOrder: 40,
  },
  {
    slug: 'anual-2-cursos',
    name: 'Anual · 2 cursos',
    description: '2 concursos juntos · economize 38%',
    type: 'COMBO',
    interval: 'YEAR',
    priceCents: 29700, // R$ 297,00
    pixDiscount: 5,
    moneyBackDays: 7,
    coverageType: 'SPECIFIC',
    maxCourses: 2,
    features: [
      'Até 2 cursos ativos ao mesmo tempo',
      'Troca livre entre eles',
      'Tudo dos planos anteriores',
      'Suporte prioritário',
      'Economia de 38% vs mensal',
    ],
    badge: 'Mais escolhido',
    isVisible: true,
    sortOrder: 50,
  },
  {
    slug: 'anual-todos',
    name: 'Anual · Todos os cursos',
    description: 'Acesso completo · economize 35%',
    type: 'FULL_ACCESS',
    interval: 'YEAR',
    priceCents: 69700, // R$ 697,00
    pixDiscount: 5,
    moneyBackDays: 7,
    coverageType: 'ALL',
    maxCourses: null,
    features: [
      'TODOS os cursos da plataforma',
      'Sem limite de cursos ativos',
      'Acesso a edital novo automático',
      'Suporte prioritário',
      'Comunidade VIP',
      'Economia de 35% vs mensal',
    ],
    badge: null,
    isVisible: true,
    sortOrder: 60,
  },
]

// Slugs LEGADOS que devem ser ocultados do checkout público
// (mantém histórico no banco, só não aparece pro novo cliente).
const LEGACY_SLUGS_TO_HIDE = ['trial', 'trial-3-dias', 'mensal', 'anual', 'vitalicio']

async function main() {
  console.log('═══ Seeding plans ═══\n')

  // Esconde planos legados
  for (const slug of LEGACY_SLUGS_TO_HIDE) {
    const existing = await prisma.pricingPlan.findUnique({ where: { slug } })
    if (existing) {
      await prisma.pricingPlan.update({
        where: { slug },
        data: { isVisible: false, active: false },
      })
      console.log(`  🙈 Legado ocultado: ${slug}`)
    }
  }

  // Cria/atualiza os 7 novos
  for (const p of PLANS) {
    const result = await prisma.pricingPlan.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        type: p.type as any,
        interval: p.interval as any,
        priceCents: p.priceCents,
        pixDiscount: p.pixDiscount,
        moneyBackDays: p.moneyBackDays,
        coverageType: p.coverageType as any,
        coverageData: undefined,
        maxCourses: p.maxCourses,
        features: p.features as any,
        badge: p.badge,
        isVisible: p.isVisible,
        sortOrder: p.sortOrder,
        active: true,
      },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        type: p.type as any,
        interval: p.interval as any,
        priceCents: p.priceCents,
        pixDiscount: p.pixDiscount,
        moneyBackDays: p.moneyBackDays,
        coverageType: p.coverageType as any,
        maxCourses: p.maxCourses,
        features: p.features as any,
        badge: p.badge,
        isVisible: p.isVisible,
        sortOrder: p.sortOrder,
        active: true,
      },
    })
    const price = (p.priceCents / 100).toFixed(2).replace('.', ',')
    const cargos = p.maxCourses == null ? 'ilimitado' : `${p.maxCourses} curso(s)`
    console.log(`  ✓ ${p.slug.padEnd(22)} R$ ${price.padEnd(10)} · ${cargos.padEnd(15)} · id=${result.id}`)
  }

  console.log('\n═══ Plans seed completo ═══')
  console.log(`Total: ${PLANS.length} planos. ${LEGACY_SLUGS_TO_HIDE.length} legados ocultados.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
