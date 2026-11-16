/**
 * Migrações aplicadas antes de existir o registro `schema_migracoes`: não se
 * registram sozinhas, então são reconhecidas pela tabela que criaram.
 * Migração nova não entra aqui — ela grava o próprio nome no registro.
 */
export const MIGRACOES_ANTERIORES_AO_REGISTRO: Record<string, string> = {
  '2026-11-09-cronograma-adaptativo-e-rag': 'material_chunks',
  '2026-11-10-vigia-crons': 'cron_execucoes',
}
