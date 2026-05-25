'use client'

import { motion, type Variants } from 'framer-motion'
import { type ReactNode } from 'react'

/**
 * Helpers de motion pra landing page. Centraliza configs pra que toda
 * a animação no site tenha cadência consistente — sem cada componente
 * inventar sua própria curva de easing.
 *
 * Princípios:
 *  - duração curta (300-500ms), sem distrair de leitura
 *  - easing suave (ease-out na entrada)
 *  - reveal por scroll (viewport once: true → não fica re-animando)
 *  - respeita prefers-reduced-motion automaticamente (framer-motion já lida)
 */

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4 } },
}

export const staggerChildren: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

/**
 * Wrapper pra revelar um bloco quando entra na viewport.
 * Uso: <Reveal><h2>...</h2></Reveal>
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'article' | 'span'
}) {
  const MotionTag = motion[as] as typeof motion.div
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={fadeInUp}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  )
}

/**
 * Wrapper que faz stagger nos filhos diretos. Cada filho deve ter
 * variants={fadeInUp} pra entrar com delay incremental.
 */
export function StaggerGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      variants={staggerChildren}
    >
      {children}
    </motion.div>
  )
}

/**
 * Item de um grupo staggered. Use dentro de <StaggerGroup>.
 */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={fadeInUp}>
      {children}
    </motion.div>
  )
}
