import { Fragment } from 'react'
import { trechosMarcados } from '@/lib/texto-marcado'
import { cn } from '@/lib/utils'

/**
 * Texto de questão com o destaque da prova ("o termo sublinhado", "a palavra
 * destacada"). Monta elementos React a partir de <b>, <i> e <u>; qualquer
 * outra coisa aparece como texto.
 */
export function TextoMarcado({ texto }: { texto: string | null | undefined }) {
  if (!texto) return null
  const trechos = trechosMarcados(texto)
  return (
    <>
      {trechos.map((t, i) =>
        t.negrito || t.italico || t.sublinhado ? (
          <span key={i} className={cn(t.negrito && 'font-semibold', t.italico && 'italic', t.sublinhado && 'underline underline-offset-2')}>
            {t.texto}
          </span>
        ) : (
          <Fragment key={i}>{t.texto}</Fragment>
        ),
      )}
    </>
  )
}
