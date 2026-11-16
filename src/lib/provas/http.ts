import { NextResponse } from 'next/server'
import { ErroProva } from './aluno'
import { apiError } from '../api-errors'

/** Erro esperado (sem acesso, prazo esgotado…) vira o status certo; o resto, 500 sem vazar detalhe. */
export function respostaDeErro(err: unknown, tag: string) {
  if (err instanceof ErroProva) return NextResponse.json({ message: err.message }, { status: err.status })
  return apiError(err, 'Não foi possível concluir. Tente de novo.', tag)
}
