'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Save, FileText, Plus, Trash2, ChevronRight, ChevronDown,
  CheckCircle2, AlertTriangle, Loader2, FilePlus2, Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { parseEditalText, type Materia, type Topico } from '@/lib/parse-edital-text'

type Course = { id: string; slug: string; name: string; cargo: string | null; orgao: string | null }

const SAMPLE = `## Direito Constitucional
1. Princípios Fundamentais
2. Direitos e Garantias Fundamentais
2.1. Direitos individuais e coletivos
2.2. Direitos sociais
3. Organização do Estado

## Direito Penal
1. Aplicação da lei penal
2. Crimes contra a pessoa
3. Crimes contra o patrimônio

## Língua Portuguesa
- Interpretação de textos
- Ortografia oficial
- Acentuação gráfica
- Concordância verbal e nominal`

export default function ManualEditalPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  // Dados do edital
  const [courseId, setCourseId] = useState('')
  const [creatingCourse, setCreatingCourse] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseCargo, setNewCourseCargo] = useState('')
  const [newCourseOrgao, setNewCourseOrgao] = useState('')

  const [ano, setAno] = useState(new Date().getFullYear())
  const [banca, setBanca] = useState('')
  const [numero, setNumero] = useState('')
  const [titulo, setTitulo] = useState('')

  // Metadados do cargo
  const [vagas, setVagas] = useState<string>('')
  const [salario, setSalario] = useState<string>('')
  const [escolaridade, setEscolaridade] = useState('')
  const [totalQuestoes, setTotalQuestoes] = useState<string>('')
  const [duracaoMin, setDuracaoMin] = useState<string>('')
  const [hasRedacao, setHasRedacao] = useState(false)
  const [wrongAnnulsRight, setWrongAnnulsRight] = useState(false)
  const [examFormat, setExamFormat] = useState<string>('')
  const [regraAnulacaoTexto, setRegraAnulacaoTexto] = useState('')
  const [dataAbertura, setDataAbertura] = useState('')
  const [dataInscricaoIni, setDataInscricaoIni] = useState('')
  const [dataInscricaoFim, setDataInscricaoFim] = useState('')
  const [dataProva, setDataProva] = useState('')
  const [taxaInscricao, setTaxaInscricao] = useState<string>('')

  // Texto colado + árvore parseada
  const [text, setText] = useState(SAMPLE)
  const [editedMaterias, setEditedMaterias] = useState<Materia[] | null>(null)
  const [cargoIndex, setCargoIndex] = useState(0)   // índice do cargo a importar (se multi)
  const [saving, setSaving] = useState(false)
  const [reformatting, setReformatting] = useState(false)

  // Diff (mostrado quando já existe edital ativo pro curso)
  const [diff, setDiff] = useState<any | null>(null)
  const [keepRemoved, setKeepRemoved] = useState<Record<string, boolean>>({})
  const [renameAccepted, setRenameAccepted] = useState<Record<string, boolean>>({})

  useEffect(() => {
    api.get('/courses?all=true')
      .then(({ data }) => setCourses(data.courses ?? []))
      .catch(() => toast.error('Falha ao carregar cursos'))
      .finally(() => setLoadingCourses(false))
  }, [])

  // Re-parse cada vez que texto mudar — preview sempre fresca
  const parseResult = useMemo(() => parseEditalText(text), [text])
  const cargos = parseResult.cargos
  const activeCargo = cargos[cargoIndex] ?? cargos[0]
  const isMultiCargo = cargos.length > 1

  // Materias a salvar = override (se o admin editou inline) OU do cargo selecionado
  const materiasParaSalvar = editedMaterias ?? activeCargo?.materias ?? []

  // Quando muda o índice do cargo OU o texto, descarta edits manuais (eles eram pro cargo anterior)
  useEffect(() => { setEditedMaterias(null) }, [cargoIndex, text])

  async function handleCreateCourse() {
    if (!newCourseName.trim()) return toast.error('Informe o nome do curso')
    setCreatingCourse(true)
    try {
      const { data } = await api.post('/admin/courses/quick-create', {
        name: newCourseName.trim(),
        cargo: newCourseCargo || null,
        orgao: newCourseOrgao || null,
      })
      setCourses((prev) => [...prev, data.course])
      setCourseId(data.course.id)
      setNewCourseName('')
      setNewCourseCargo('')
      setNewCourseOrgao('')
      toast.success(`Curso "${data.course.name}" criado`)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Falha ao criar curso')
    } finally {
      setCreatingCourse(false)
    }
  }

  function buildPayload() {
    const tituloFinal = titulo.trim() || `${courses.find((c) => c.id === courseId)?.name ?? 'Edital'} — ${ano}`
    return {
      courseId,
      ano,
      banca: banca || undefined,
      numero: numero || undefined,
      titulo: tituloFinal,
      cargoNome: courses.find((c) => c.id === courseId)?.cargo || undefined,
      vagas: vagas ? Number(vagas) : undefined,
      salario: salario ? Number(salario) : undefined,
      escolaridade: escolaridade || undefined,
      totalQuestoes: totalQuestoes ? Number(totalQuestoes) : undefined,
      duracaoMin: duracaoMin ? Number(duracaoMin) : undefined,
      hasRedacao,
      wrongAnnulsRight,
      examFormat: examFormat || undefined,
      regraAnulacaoTexto: regraAnulacaoTexto || undefined,
      dataAbertura: dataAbertura || undefined,
      dataInscricaoIni: dataInscricaoIni || undefined,
      dataInscricaoFim: dataInscricaoFim || undefined,
      dataProva: dataProva || undefined,
      taxaInscricao: taxaInscricao ? Number(taxaInscricao) : undefined,
      materias: materiasParaSalvar,
    }
  }

  async function handleSave() {
    if (!courseId) return toast.error('Escolha um curso')
    if (materiasParaSalvar.length === 0) return toast.error('Adicione pelo menos uma matéria')

    setSaving(true)
    try {
      // 1. Checa se já existe edital ativo → faz diff
      const diffRes = await api.post('/admin/editais/diff', {
        courseId, materias: materiasParaSalvar,
      })
      if (diffRes.data.hasCurrentEdital) {
        setDiff(diffRes.data)
        setSaving(false)
        return
      }
      // 2. Sem edital ativo → save direto
      const { data } = await api.post('/admin/editais/save-structure', buildPayload())
      toast.success(`✅ Salvo: ${data.materiasSalvas} matérias, ${data.topicosSalvos} tópicos`)
      router.push('/admin/editais')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function reformatWithAI() {
    if (!text.trim() || text.trim().length < 50) {
      return toast.error('Cole pelo menos 50 caracteres antes de reformatar')
    }
    setReformatting(true)
    try {
      const { data } = await api.post('/admin/editais/reformat-text', { text })
      if (data.reformatted) {
        setText(data.reformatted)
        setEditedMaterias(null)
        toast.success('Texto reformatado pela IA — confere a árvore abaixo')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Falha ao reformatar')
    } finally {
      setReformatting(false)
    }
  }

  async function applyDiff() {
    if (!diff) return
    setSaving(true)
    try {
      const removed = (diff.diff.removed ?? []).map((r: any) => ({
        topicId: r.topicId,
        action: keepRemoved[r.topicId] ? 'keep' : 'archive',
      }))
      const renames = (diff.diff.renamed_suspected ?? []).map((r: any) => ({
        oldTopicId: r.oldTopicId,
        oldName: r.oldName,
        newName: r.newName,
        isRename: renameAccepted[r.oldTopicId] !== false, // default = aceita
      }))
      const { data } = await api.post('/admin/editais/apply-diff', {
        ...buildPayload(),
        decisions: { removed, renames },
      })
      toast.success(
        `✅ Edital atualizado · +${data.summary.added} novos · ${data.summary.removed} arquivados · ${data.summary.merged} fundidos`,
      )
      router.push('/admin/editais')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Falha ao aplicar diff')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/editais')}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs hover:bg-muted inline-flex items-center gap-1"
        >
          <ChevronLeft className="w-3 h-3" /> Voltar
        </button>
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500" /> Cadastrar edital (manual)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cole as matérias e tópicos em texto estruturado. Sem IA, sem PDF. Você controla 100%.
          </p>
        </div>
      </div>

      {/* ── 1) Curso ──────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-sm">1) Curso</h2>
        {loadingCourses ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando cursos…
          </div>
        ) : (
          <>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— escolha um curso já cadastrado —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.cargo ? ` · ${c.cargo}` : ''}{c.orgao ? ` (${c.orgao})` : ''}
                </option>
              ))}
            </select>
            <details className="text-xs">
              <summary className="cursor-pointer text-brand-500 hover:underline inline-flex items-center gap-1">
                <FilePlus2 className="w-3 h-3" /> ou criar um curso novo
              </summary>
              <div className="mt-2 p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="Nome do curso (ex: PF Agente)"
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                  <input value={newCourseCargo} onChange={(e) => setNewCourseCargo(e.target.value)}
                    placeholder="Cargo (ex: Agente de Polícia Federal)"
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                  <input value={newCourseOrgao} onChange={(e) => setNewCourseOrgao(e.target.value)}
                    placeholder="Órgão (ex: Polícia Federal)"
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                </div>
                <button onClick={handleCreateCourse} disabled={creatingCourse}
                  className="rounded-lg bg-brand-500 text-white px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50">
                  {creatingCourse ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Criar e selecionar
                </button>
              </div>
            </details>
          </>
        )}
      </div>

      {/* ── 2) Dados do edital ─────────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-sm">2) Dados do edital</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Título" value={titulo} onChange={setTitulo} placeholder="auto se vazio" />
          <Field label="Ano" type="number" value={String(ano)} onChange={(v) => setAno(Number(v) || ano)} />
          <Field label="Banca" value={banca} onChange={setBanca} placeholder="cebraspe, fgv..." />
          <Field label="Número" value={numero} onChange={setNumero} placeholder="001/2026" />
        </div>
      </div>

      {/* ── 3) Informações do cargo ────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-sm">3) Informações do cargo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Vagas" type="number" value={vagas} onChange={setVagas} />
          <Field label="Salário (R$)" type="number" value={salario} onChange={setSalario} />
          <Field label="Escolaridade" value={escolaridade} onChange={setEscolaridade} placeholder="Superior..." />
          <Field label="Total questões" type="number" value={totalQuestoes} onChange={setTotalQuestoes} />
          <Field label="Duração (min)" type="number" value={duracaoMin} onChange={setDuracaoMin} />
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Formato</label>
            <select value={examFormat} onChange={(e) => setExamFormat(e.target.value)}
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs">
              <option value="">—</option>
              <option value="CE">Certo/Errado</option>
              <option value="ME_5">Múltipla 5 alt.</option>
              <option value="ME_4">Múltipla 4 alt.</option>
              <option value="MISTA">Mista</option>
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-xs mt-4">
            <input type="checkbox" checked={hasRedacao} onChange={(e) => setHasRedacao(e.target.checked)} />
            Tem redação
          </label>
          <label className="flex items-center gap-1.5 text-xs mt-4">
            <input type="checkbox" checked={wrongAnnulsRight} onChange={(e) => setWrongAnnulsRight(e.target.checked)} />
            Errada anula certa
          </label>
        </div>
        <Field label="Regra de anulação (texto livre)" value={regraAnulacaoTexto} onChange={setRegraAnulacaoTexto}
          placeholder="ex: 'Cada item errado anulará um item certo'" full />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Data abertura" type="date" value={dataAbertura} onChange={setDataAbertura} />
          <Field label="Inscrição início" type="date" value={dataInscricaoIni} onChange={setDataInscricaoIni} />
          <Field label="Inscrição fim" type="date" value={dataInscricaoFim} onChange={setDataInscricaoFim} />
          <Field label="Data prova" type="date" value={dataProva} onChange={setDataProva} />
          <Field label="Taxa (R$)" type="number" value={taxaInscricao} onChange={setTaxaInscricao} />
        </div>
      </div>

      {/* ── 4) Matérias e tópicos ──────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-sm">4) Matérias e tópicos</h2>

        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-xs space-y-1">
          <div className="font-semibold text-blue-700 dark:text-blue-300">Aceita 2 formatos (pode misturar):</div>
          <div className="text-blue-600 dark:text-blue-200 space-y-0.5">
            <div><strong>Formato estruturado:</strong> <code className="bg-blue-100 dark:bg-blue-800/40 px-1 rounded">## Matéria</code> → <code className="bg-blue-100 dark:bg-blue-800/40 px-1 rounded">1. Tópico</code> → <code className="bg-blue-100 dark:bg-blue-800/40 px-1 rounded">1.1. Subtópico</code></div>
            <div><strong>Formato cru do edital:</strong> <code className="bg-blue-100 dark:bg-blue-800/40 px-1 rounded">DIREITO PENAL: 1 Conceito. 1.1 Princípios. 2 Crimes...</code> (cola direto do PDF)</div>
            <div><strong>Multi-cargo:</strong> separe blocos com <code className="bg-blue-100 dark:bg-blue-800/40 px-1 rounded">CARGO 1: DELEGADO</code>, <code className="bg-blue-100 dark:bg-blue-800/40 px-1 rounded">CARGO 2: ESCRIVÃO</code> etc. O sistema separa e você escolhe qual importar.</div>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setEditedMaterias(null) }}
          rows={16}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={reformatWithAI}
            disabled={reformatting || !text.trim()}
            className="rounded-lg bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {reformatting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Reformatar com IA
          </button>
          <span className="text-[10px] text-muted-foreground">
            Cola direto do PDF e clica aqui se o preview ficou vazio ou bagunçado.
          </span>
        </div>

        {/* Seletor de cargo (só aparece se múltiplos cargos detectados) */}
        {isMultiCargo && (
          <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-3 space-y-2">
            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
              <FileText className="w-3 h-3" /> {cargos.length} cargos detectados — escolha qual importar agora:
            </div>
            <div className="flex flex-wrap gap-2">
              {cargos.map((c, i) => {
                const total = c.materias.reduce((a, m) => a + m.topicos.length, 0)
                const isActive = i === cargoIndex
                return (
                  <button
                    key={i}
                    onClick={() => setCargoIndex(i)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                      isActive
                        ? 'bg-purple-500 text-white'
                        : 'bg-white dark:bg-card border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                    }`}
                  >
                    {c.nome ?? `Cargo ${i + 1}`}
                    <span className="ml-1 opacity-70">({c.materias.length}m · {total}t)</span>
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-purple-600 dark:text-purple-300">
              Salve um cargo de cada vez — depois troque o curso no topo, volte aqui, clique no próximo cargo e salve de novo.
            </p>
          </div>
        )}

        {parseResult.warnings.length > 0 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-2 text-xs space-y-1">
            <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {parseResult.warnings.length} aviso(s):
            </div>
            {parseResult.warnings.slice(0, 5).map((w, i) => (
              <div key={i} className="text-amber-600 dark:text-amber-200">
                Linha {w.line}: {w.message} — "<span className="font-mono">{w.text.slice(0, 50)}</span>"
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-muted-foreground uppercase">
            Preview ({materiasParaSalvar.length} matérias · {materiasParaSalvar.reduce((a, m) => a + m.topicos.length, 0)} tópicos)
          </div>
          {editedMaterias && (
            <button onClick={() => setEditedMaterias(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground">
              ↺ Voltar pro texto
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto p-1">
          {materiasParaSalvar.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground p-6">
              Cole as matérias acima pra ver a árvore.
            </div>
          ) : (
            materiasParaSalvar.map((m, mi) => (
              <MateriaPreview
                key={mi}
                materia={m}
                onUpdate={(patch) => {
                  const copy = [...materiasParaSalvar]
                  copy[mi] = { ...copy[mi], ...patch }
                  setEditedMaterias(copy)
                }}
                onRemove={() => {
                  setEditedMaterias(materiasParaSalvar.filter((_, i) => i !== mi))
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* ── 5) Salvar ──────────────────────────────────────────────────── */}
      {!diff && (
        <div className="card p-5 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 inline text-green-500 mr-1" />
            Vai salvar {materiasParaSalvar.length} matérias com{' '}
            {materiasParaSalvar.reduce((a, m) => a + m.topicos.length, 0)} tópicos.
            Se já existe edital ativo desse curso, mostro o que vai mudar antes de aplicar.
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !courseId || materiasParaSalvar.length === 0}
            className="rounded-xl bg-green-500 text-white px-6 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando…</>
              : <><Save className="w-4 h-4" /> Salvar edital</>}
          </button>
        </div>
      )}

      {/* ── DIFF VIEW — só aparece quando já existe edital ativo ───────── */}
      {diff && (
        <div className="card p-5 space-y-4 border-l-4 border-l-amber-500 animate-fade-in">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Já existe edital ativo — revise as mudanças
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              "{diff.currentEditalTitulo}" será substituído. Conteúdo (resumos, flashcards, questões) é
              preservado nos tópicos que continuam e migrado nos renomeados.
              <strong> Questões oficiais nunca são apagadas</strong> (patrimônio).
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2 text-center">
              <div className="font-bold text-green-700 dark:text-green-300">{diff.stats.adicionados}</div>
              <div className="text-muted-foreground">novos</div>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2 text-center">
              <div className="font-bold text-red-700 dark:text-red-300">{diff.stats.removidos}</div>
              <div className="text-muted-foreground">removidos</div>
            </div>
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-2 text-center">
              <div className="font-bold text-yellow-700 dark:text-yellow-300">{diff.stats.renomeados_provaveis}</div>
              <div className="text-muted-foreground">renomeações?</div>
            </div>
            <div className="rounded-lg bg-muted p-2 text-center">
              <div className="font-bold">{diff.stats.inalterados}</div>
              <div className="text-muted-foreground">inalterados</div>
            </div>
          </div>

          {/* Renames suspeitos */}
          {diff.diff.renamed_suspected.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold">🟡 Possíveis renomeações</h3>
              <p className="text-xs text-muted-foreground">
                Marque ✅ se é o mesmo tópico só com nome diferente (conteúdo migra) ou ❌ se são diferentes.
              </p>
              {diff.diff.renamed_suspected.map((r: any) => {
                const accepted = renameAccepted[r.oldTopicId] !== false
                return (
                  <div key={r.oldTopicId} className="rounded-lg border border-border p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-red-600 dark:text-red-400 line-through truncate">{r.oldName}</div>
                        <div className="text-green-600 dark:text-green-400 font-semibold truncate">→ {r.newName}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">similaridade: {Math.round(r.similarity * 100)}%</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setRenameAccepted((s) => ({ ...s, [r.oldTopicId]: true }))}
                          className={`px-2 py-1 rounded text-xs ${accepted ? 'bg-green-500 text-white' : 'border border-border'}`}>
                          ✅ Mesmo
                        </button>
                        <button onClick={() => setRenameAccepted((s) => ({ ...s, [r.oldTopicId]: false }))}
                          className={`px-2 py-1 rounded text-xs ${!accepted ? 'bg-red-500 text-white' : 'border border-border'}`}>
                          ❌ Diferente
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Adicionados */}
          {diff.diff.added.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-bold">🟢 Tópicos novos ({diff.diff.added.length})</h3>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {diff.diff.added.map((a: any, i: number) => (
                  <div key={i} className="text-xs px-2 py-1 rounded bg-green-50/50 dark:bg-green-900/10 text-green-700 dark:text-green-300">
                    + {a.where}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removidos */}
          {diff.diff.removed.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-bold">🔴 Tópicos removidos ({diff.diff.removed.length})</h3>
              <p className="text-xs text-muted-foreground">
                Por padrão arquiva (some pra alunos, mas dá pra restaurar). Marque "manter" se ainda é relevante.
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {diff.diff.removed.map((r: any) => (
                  <div key={r.topicId} className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded bg-red-50/50 dark:bg-red-900/10">
                    <div className="flex-1 min-w-0">
                      <span className="text-red-700 dark:text-red-300">- {r.name}</span>
                      {r.hasContent && <span className="ml-1 text-[10px] text-muted-foreground">(tem conteúdo)</span>}
                    </div>
                    <label className="flex items-center gap-1 shrink-0">
                      <input type="checkbox" checked={!!keepRemoved[r.topicId]}
                        onChange={(e) => setKeepRemoved((s) => ({ ...s, [r.topicId]: e.target.checked }))} />
                      <span>manter</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-3 flex gap-2">
            <button onClick={() => setDiff(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
              Voltar
            </button>
            <button onClick={applyDiff} disabled={saving}
              className="rounded-xl bg-amber-500 text-white px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando…</>
                : <><CheckCircle2 className="w-4 h-4" /> Aplicar mudanças e ativar edital novo</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', placeholder, full,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; full?: boolean
}) {
  return (
    <div className={full ? 'sm:col-span-4' : ''}>
      <label className="text-[10px] font-bold uppercase text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
      />
    </div>
  )
}

function MateriaPreview({
  materia, onUpdate, onRemove,
}: {
  materia: Materia
  onUpdate: (patch: Partial<Materia>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="rounded-lg border border-border bg-card/30">
      <div className="flex items-center gap-2 p-2">
        <button onClick={() => setExpanded((v) => !v)} className="p-0.5 hover:bg-muted rounded">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <input
          value={materia.nome}
          onChange={(e) => onUpdate({ nome: e.target.value })}
          className="flex-1 bg-transparent font-semibold text-xs border-none outline-none"
        />
        <span className="text-[10px] text-muted-foreground">{materia.topicos.length} tópicos</span>
        <button onClick={onRemove} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-0.5 rounded">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {expanded && (
        <div className="px-2 pb-2 border-t border-border pt-1.5 space-y-0.5">
          {materia.topicos.map((t, ti) => (
            <TopicoPreview
              key={ti}
              topico={t}
              index={ti + 1}
              onUpdate={(patch) => {
                const copy = [...materia.topicos]
                copy[ti] = { ...copy[ti], ...patch }
                onUpdate({ topicos: copy })
              }}
              onRemove={() => {
                onUpdate({ topicos: materia.topicos.filter((_, i) => i !== ti) })
              }}
            />
          ))}
          <button
            onClick={() => onUpdate({
              topicos: [...materia.topicos, { nome: 'Novo tópico', ordem: materia.topicos.length, subtopicos: [] }],
            })}
            className="text-[10px] text-brand-500 hover:underline inline-flex items-center gap-0.5 mt-1"
          >
            <Plus className="w-2.5 h-2.5" /> tópico
          </button>
        </div>
      )}
    </div>
  )
}

function TopicoPreview({
  topico, index, onUpdate, onRemove,
}: {
  topico: Topico
  index: number
  onUpdate: (patch: Partial<Topico>) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 group">
        <span className="text-muted-foreground text-[10px] w-6 text-right">{index}.</span>
        <input
          value={topico.nome}
          onChange={(e) => onUpdate({ nome: e.target.value })}
          className="flex-1 bg-transparent text-xs border-b border-transparent hover:border-border focus:border-brand-500 outline-none py-0.5"
        />
        {topico.subtopicos && topico.subtopicos.length > 0 && (
          <span className="text-[10px] text-muted-foreground">+{topico.subtopicos.length} sub</span>
        )}
        <button onClick={onRemove} className="text-red-500 opacity-0 group-hover:opacity-100 p-0.5">
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
      {topico.subtopicos && topico.subtopicos.length > 0 && (
        <div className="ml-8 space-y-0.5 border-l border-border pl-2">
          {topico.subtopicos.map((s, si) => (
            <div key={si} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="opacity-50">{index}.{si + 1}.</span>
              <span>{s.nome}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
