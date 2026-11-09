// Ensina o Node a resolver o alias `@/` do projeto e imports sem extensão.
// O Next faz isso no build; um teste rodando no Node puro precisa disto.
const SRC = new URL('../../src/', import.meta.url).href
export async function resolve(especificador, contexto, proximo) {
  if (especificador.startsWith('@/')) especificador = SRC + especificador.slice(2)
  try {
    return await proximo(especificador, contexto)
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND' && e.code !== 'ERR_UNSUPPORTED_DIR_IMPORT') throw e
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      try { return await proximo(especificador + ext, contexto) } catch {}
    }
    throw e
  }
}
