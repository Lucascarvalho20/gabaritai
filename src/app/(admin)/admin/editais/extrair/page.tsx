'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, Loader2, Plus, Trash2, ChevronRight, ChevronDown,
  Save, AlertTriangle, Check, FileText, Sparkles, X, FilePlus2,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Subtopico = { nome: string; ordem?: number; subtopicos?: Subtopico[] }
type Topico = { nome: string; ordem?: number; subtopicos?: Subtopico[] }
type Materia = {
  nome: string
  ordem?: number
  qtdQuestoes?: number | null
  peso?: number | null
  subjectId?: string
  topicos: Topico[]
}
type CargoMatch = {
  courseId: string
  courseName: string
  cargo: string | null
  orgao: string | null
  score: number
}
type CargoExtracted = {
  nome: string
  vagas: number | null
  salario: number | null
  escolaridade: string | null
  totalQuestoes: number | null
  duracaoMin: number | null
  hasRedacao: boolean
  examFormat: 'CE' | 'ME_5' | 'ME_4' | 'MISTA' | null
  wrongAnnulsRight: boolean
  regraAnulacaoTexto: string | null
  materias: Materia[]
  courseMatches: CargoMatch[]
  suggestedCourseId: string | null
}
type EditalGeral = {
  numero: string | null
  ano: number | null
  orgao: string | null
  banca: string | null
  dataAbertura: string | null
  dataInscricaoIni: string | null
  dataInscricaoFim: string | null
  dataProva: string | null
  taxaInscricao: number | null
}
type Course = { id: string; slug: string; name: string; cargo: string | null; orgao: string | null }
type KnownSubject = { id: string; name: string; slug: string }
type Omissao = { cargo: string; declarado: number; retornado: number }
type ExtractResponse = {
  ok: true
  pdfHash: string
  pdfSizeKb: number
  editalGeral: EditalGeral
  cargos: CargoExtracted[]
  knownCourses: Course[]
  knownSubjects: KnownSubject[]
  omissoes: Omissao[]
  stats: { cargos: number; cargosComMatch: number; materias: number; topicos: number }
}

type CargoUi = {
  ext: CargoExtracted
  edited: CargoExtracted              // copy for in-place edits
  action: 'import' | 'ignore' | 'create-new-course'
  selectedCourseId: string | null
  newCourseName: string
  newCourseOrgao: string
  newCourseParentSlug: string
  expanded: boolean
  saving: boolean
  saved: boolean
  savedEditalId?: string
}

export default function ExtrairEditalPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [pdfHash, setPdfHash] = useState('')
  const [editalGeral, setEditalGeral] = useState<EditalGeral | null>(null)
  const [knownCourses, setKnownCourses] = useState<Course[]>([])
  const [knownSubjects, setKnownSubjects] = useState<KnownSubject[]>([])
  const [cargosUi, setCargosUi] = useState<CargoUi[]>([])
  const [omissoes, setOmissoes] = useState<Omissao[]>([])

  async function handleExtract() {
    if (!file) return toast.error('Anexe o PDF do edital')
    setExtracting(true)
    try {
      const form = new FormData()
      form.append('pdf', file)
      const { data } = await api.post<ExtractResponse>(
        '/admin/editais/extract-structure',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      setEditalGeral(data.editalGeral)
      setKnownCourses(data.knownCourses)
      setKnownSubjects(data.knownSubjects)
      setPdfHash(data.pdfHash)
      setOmissoes(data.omissoes ?? [])

      // Auto-match matérias contra subjects globais
      const cargosUi: CargoUi[] = data.cargos.map((c, idx) => {
        const matEdited = (c.materias ?? []).map((m) => {
          const found = data.knownSubjects.find((s) => s.name.toLowerCase() === m.nome.toLowerCase())
          return { ...m, subjectId: found?.id }
        })
        return {
          ext: c,
          edited: { ...c, materias: matEdited },
          action: c.suggestedCourseId ? 'import' : 'ignore',
          selectedCourseId: c.suggestedCourseId,
          newCourseName: c.nome,
          newCourseOrgao: data.editalGeral?.orgao ?? '',
          newCourseParentSlug: '',
          expanded: idx === 0,
          saving: false,
          saved: false,
        }
      })
      setCargosUi(cargosUi)

      toast.success(
        `${data.stats.cargos} cargo(s) detectados · ${data.stats.materias} matérias · ${data.stats.topicos} tópicos`,
      )
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro na extração')
    } finally {
      setExtracting(false)
    }
  }

  function updateCargoUi(idx: number, patch: Partial<CargoUi>) {
    setCargosUi((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], ...patch }
      return copy
    })
  }

  function updateCargoEdited(idx: number, patch: Partial<CargoExtracted>) {
    setCargosUi((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], edited: { ...copy[idx].edited, ...patch } }
      return copy
    })
  }

  async function saveCargo(idx: number) {
    const c = cargosUi[idx]
    if (!c) return
    if (c.action === 'ignore') return toast.error('Cargo marcado como ignorar')

    let courseId = c.selectedCourseId

    // Cria curso novo se for o caso
    if (c.action === 'create-new-course') {
      if (!c.newCourseName.trim()) return toast.error('Informe o nome do curso novo')
      updateCargoUi(idx, { saving: true })
      try {
        const { data } = await api.post('/admin/courses/quick-create', {
          name: c.newCourseName.trim(),
          cargo: c.edited.nome,
          orgao: c.newCourseOrgao || editalGeral?.orgao || null,
          parentSlug: c.newCourseParentSlug || null,
        })
        courseId = data.course.id
        // anexa o curso novo à lista local pra UI mostrar
        setKnownCourses((prev) => [...prev, data.course])
        updateCargoUi(idx, { selectedCourseId: courseId, action: 'import' })
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? 'Falha ao criar curso')
        updateCargoUi(idx, { saving: false })
        return
      }
    } else {
      if (!courseId) return toast.error('Escolha um curso pra esse cargo')
      updateCargoUi(idx, { saving: true })
    }

    try {
      const courseLabel = knownCourses.find((kc) => kc.id === courseId)?.name ?? c.edited.nome
      const titulo = `${courseLabel} — ${editalGeral?.ano ?? new Date().getFullYear()}`
      const { data } = await api.post('/admin/editais/save-structure', {
        courseId,
        ano: editalGeral?.ano ?? new Date().getFullYear(),
        banca: editalGeral?.banca ?? undefined,
        numero: editalGeral?.numero ?? undefined,
        titulo,
        pdfHash,
        cargoNome: c.edited.nome,
        vagas: c.edited.vagas,
        salario: c.edited.salario,
        escolaridade: c.edited.escolaridade,
        totalQuestoes: c.edited.totalQuestoes,
        duracaoMin: c.edited.duracaoMin,
        hasRedacao: c.edited.hasRedacao,
        wrongAnnulsRight: c.edited.wrongAnnulsRight,
        examFormat: c.edited.examFormat,
        regraAnulacaoTexto: c.edited.regraAnulacaoTexto,
        dataAbertura: editalGeral?.dataAbertura,
        dataInscricaoIni: editalGeral?.dataInscricaoIni,
        dataInscricaoFim: editalGeral?.dataInscricaoFim,
        dataProva: editalGeral?.dataProva,
        taxaInscricao: editalGeral?.taxaInscricao,
        materias: c.edited.materias,
      })
      toast.success(
        `✅ ${courseLabel} — ${data.materiasSalvas} matérias, ${data.topicosSalvos} tópicos`,
      )
      updateCargoUi(idx, {
        saving: false,
        saved: true,
        savedEditalId: data.editalId,
      })
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Falha ao salvar')
      updateCargoUi(idx, { saving: false })
    }
  }

  const allImportable = cargosUi.filter((c) => c.action !== 'ignore' && !c.saved)
  const allSaved = cargosUi.length > 0 && cargosUi.every((c) => c.saved || c.action === 'ignore')

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-500" /> Extrair edital
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sobe o PDF do edital oficial. A IA detecta TODOS os cargos, vagas, duração, redação, banca e
          conteúdo programático. Você confere e importa só os cargos que estão no site.
        </p>
      </div>

      {/* ── Passo 1: Upload ────────────────────────────────────────────── */}
      {!editalGeral && (
        <div className="card p-5 space-y-4">
          <h2 className="font-bold">1) PDF do edital</h2>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-border file:bg-card file:text-sm"
          />
          {file && (
            <p className="text-xs text-muted-foreground">
              {file.name} — {Math.round(file.size / 1024)} KB
            </p>
          )}
          <button
            onClick={handleExtract}
            disabled={extracting || !file}
            className="rounded-xl bg-brand-500 text-white px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {extracting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Lendo edital… (30-90s)</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Extrair com IA</>
            )}
          </button>
          <p className="text-[10px] text-muted-foreground">
            Funciona com editais multi-cargo (PF, PC). A IA identifica perito, agente, escrivão etc separadamente.
          </p>
        </div>
      )}

      {/* ── Aviso de matérias possivelmente omitidas pela IA ──────────────── */}
      {editalGeral && omissoes.length > 0 && (
        <div className="card p-4 bg-yellow-50/40 dark:bg-yellow-900/15 border-yellow-200 dark:border-yellow-800/40 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="w-4 h-4" /> A IA pode ter pulado matérias
          </div>
          <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-0.5 list-disc pl-5">
            {omissoes.map((o, i) => (
              <li key={i}>
                <strong>{o.cargo}</strong>: a IA declarou {o.declarado} matérias mas só retornou {o.retornado}. Confira o conteúdo programático abaixo e adicione manualmente o que faltou.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Passo 2: Edital geral ──────────────────────────────────────── */}
      {editalGeral && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> Edital identificado
            </h2>
            <button
              onClick={() => { setEditalGeral(null); setCargosUi([]); setFile(null) }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Subir outro PDF
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <InputBox label="Órgão" value={editalGeral.orgao ?? ''}
              onChange={(v) => setEditalGeral({ ...editalGeral, orgao: v })} />
            <InputBox label="Banca" value={editalGeral.banca ?? ''}
              onChange={(v) => setEditalGeral({ ...editalGeral, banca: v })} />
            <InputBox label="Número" value={editalGeral.numero ?? ''}
              onChange={(v) => setEditalGeral({ ...editalGeral, numero: v })} />
            <InputBox label="Ano" type="number" value={String(editalGeral.ano ?? '')}
              onChange={(v) => setEditalGeral({ ...editalGeral, ano: Number(v) || null })} />
            <InputBox label="Data abertura" type="date" value={editalGeral.dataAbertura ?? ''}
              onChange={(v) => setEditalGeral({ ...editalGeral, dataAbertura: v || null })} />
            <InputBox label="Inscrição início" type="date" value={editalGeral.dataInscricaoIni ?? ''}
              onChange={(v) => setEditalGeral({ ...editalGeral, dataInscricaoIni: v || null })} />
            <InputBox label="Inscrição fim" type="date" value={editalGeral.dataInscricaoFim ?? ''}
              onChange={(v) => setEditalGeral({ ...editalGeral, dataInscricaoFim: v || null })} />
            <InputBox label="Data prova" type="date" value={editalGeral.dataProva ?? ''}
              onChange={(v) => setEditalGeral({ ...editalGeral, dataProva: v || null })} />
          </div>
        </div>
      )}

      {/* ── Passo 3: Cargos detectados ─────────────────────────────────── */}
      {cargosUi.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              Cargos detectados ({cargosUi.length})
            </h2>
            <div className="text-xs text-muted-foreground">
              {cargosUi.filter((c) => c.action !== 'ignore').length} pra importar ·{' '}
              {cargosUi.filter((c) => c.saved).length} salvos
            </div>
          </div>

          {cargosUi.map((c, idx) => (
            <CargoCard
              key={idx}
              ui={c}
              knownCourses={knownCourses}
              knownSubjects={knownSubjects}
              onUpdateUi={(patch) => updateCargoUi(idx, patch)}
              onUpdateEdited={(patch) => updateCargoEdited(idx, patch)}
              onSave={() => saveCargo(idx)}
            />
          ))}

          {allSaved && (
            <div className="card p-5 border-l-4 border-l-green-500 text-sm space-y-2">
              <div className="font-bold text-green-700 dark:text-green-300">
                ✅ Todos os cargos foram processados
              </div>
              <button onClick={() => router.push('/admin/editais')} className="btn-primary btn-md">
                Ver editais
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InputBox({
  label, value, onChange, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
      />
    </div>
  )
}

function CargoCard({
  ui, knownCourses, knownSubjects, onUpdateUi, onUpdateEdited, onSave,
}: {
  ui: CargoUi
  knownCourses: Course[]
  knownSubjects: KnownSubject[]
  onUpdateUi: (patch: Partial<CargoUi>) => void
  onUpdateEdited: (patch: Partial<CargoExtracted>) => void
  onSave: () => void
}) {
  const c = ui.edited
  const ignored = ui.action === 'ignore'
  return (
    <div className={`card p-4 space-y-3 ${ignored ? 'opacity-50' : ''} ${ui.saved ? 'border-l-4 border-l-green-500' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateUi({ expanded: !ui.expanded })}
          className="p-1 hover:bg-muted rounded"
        >
          {ui.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <input
          value={c.nome}
          onChange={(e) => onUpdateEdited({ nome: e.target.value })}
          disabled={ignored || ui.saved}
          className="flex-1 bg-transparent font-bold text-sm border-none outline-none"
        />
        {ui.saved && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Salvo
          </span>
        )}
        {!ui.saved && (
          <select
            value={ui.action}
            onChange={(e) => onUpdateUi({ action: e.target.value as any })}
            className="text-xs rounded-md border border-border bg-background px-2 py-1"
          >
            <option value="import">Importar</option>
            <option value="create-new-course">Criar curso novo</option>
            <option value="ignore">Ignorar</option>
          </select>
        )}
      </div>

      {ui.expanded && !ignored && (
        <>
          {/* Course match */}
          {ui.action === 'import' && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                Vincular a este curso do site
              </label>
              <select
                value={ui.selectedCourseId ?? ''}
                onChange={(e) => onUpdateUi({ selectedCourseId: e.target.value || null })}
                disabled={ui.saved}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                <option value="">— escolha um curso —</option>
                {c.courseMatches.length > 0 && (
                  <optgroup label="Sugestões IA">
                    {c.courseMatches.map((m) => (
                      <option key={m.courseId} value={m.courseId}>
                        {m.courseName} ({Math.round(m.score * 100)}% match)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Todos os cursos">
                  {knownCourses.map((kc) => (
                    <option key={kc.id} value={kc.id}>{kc.name}</option>
                  ))}
                </optgroup>
              </select>
              {c.courseMatches.length === 0 && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  ⚠ Nenhum curso parecido encontrado. Considere "Criar curso novo".
                </p>
              )}
            </div>
          )}

          {ui.action === 'create-new-course' && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <FilePlus2 className="w-3.5 h-3.5" /> Criar curso novo
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <InputBox label="Nome do curso" value={ui.newCourseName}
                  onChange={(v) => onUpdateUi({ newCourseName: v })} />
                <InputBox label="Órgão" value={ui.newCourseOrgao}
                  onChange={(v) => onUpdateUi({ newCourseOrgao: v })} />
                <InputBox label="Concurso pai (slug)" value={ui.newCourseParentSlug}
                  onChange={(v) => onUpdateUi({ newCourseParentSlug: v })} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Concurso pai agrupa cargos do mesmo edital (ex: "pf" pra agente+escrivão+delegado).
              </p>
            </div>
          )}

          {/* Metadados do cargo */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-muted-foreground">Informações do cargo</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <InputBox label="Vagas" type="number" value={String(c.vagas ?? '')}
                onChange={(v) => onUpdateEdited({ vagas: v ? Number(v) : null })} />
              <InputBox label="Salário (R$)" type="number" value={String(c.salario ?? '')}
                onChange={(v) => onUpdateEdited({ salario: v ? Number(v) : null })} />
              <InputBox label="Escolaridade" value={c.escolaridade ?? ''}
                onChange={(v) => onUpdateEdited({ escolaridade: v || null })} />
              <InputBox label="Total questões" type="number" value={String(c.totalQuestoes ?? '')}
                onChange={(v) => onUpdateEdited({ totalQuestoes: v ? Number(v) : null })} />
              <InputBox label="Duração (min)" type="number" value={String(c.duracaoMin ?? '')}
                onChange={(v) => onUpdateEdited({ duracaoMin: v ? Number(v) : null })} />
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Formato</label>
                <select
                  value={c.examFormat ?? ''}
                  onChange={(e) => onUpdateEdited({ examFormat: (e.target.value || null) as any })}
                  className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                >
                  <option value="">—</option>
                  <option value="CE">Certo/Errado</option>
                  <option value="ME_5">Múltipla 5 alternativas</option>
                  <option value="ME_4">Múltipla 4 alternativas</option>
                  <option value="MISTA">Mista</option>
                </select>
              </div>
              <label className="flex items-center gap-1.5 mt-4">
                <input type="checkbox" checked={c.hasRedacao}
                  onChange={(e) => onUpdateEdited({ hasRedacao: e.target.checked })} />
                <span>Tem redação</span>
              </label>
              <label className="flex items-center gap-1.5 mt-4">
                <input type="checkbox" checked={c.wrongAnnulsRight}
                  onChange={(e) => onUpdateEdited({ wrongAnnulsRight: e.target.checked })} />
                <span>Errada anula certa</span>
              </label>
            </div>
            {c.regraAnulacaoTexto && (
              <div className="text-[10px] text-muted-foreground italic px-2 py-1 rounded bg-muted/30">
                "{c.regraAnulacaoTexto}"
              </div>
            )}
          </div>

          {/* Matérias */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-muted-foreground">
              Conteúdo programático ({c.materias.length} matérias)
            </h4>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {c.materias.map((m, mi) => (
                <MateriaCard
                  key={mi}
                  materia={m}
                  knownSubjects={knownSubjects}
                  onUpdate={(patch) => {
                    const copy = [...c.materias]
                    copy[mi] = { ...copy[mi], ...patch }
                    onUpdateEdited({ materias: copy })
                  }}
                  onRemove={() => {
                    onUpdateEdited({ materias: c.materias.filter((_, i) => i !== mi) })
                  }}
                  onUpdateTopico={(ti, patch) => {
                    const copy = [...c.materias]
                    copy[mi].topicos[ti] = { ...copy[mi].topicos[ti], ...patch }
                    onUpdateEdited({ materias: copy })
                  }}
                  onRemoveTopico={(ti) => {
                    const copy = [...c.materias]
                    copy[mi].topicos = copy[mi].topicos.filter((_, i) => i !== ti)
                    onUpdateEdited({ materias: copy })
                  }}
                  onAddTopico={() => {
                    const copy = [...c.materias]
                    copy[mi].topicos.push({ nome: 'Novo tópico' })
                    onUpdateEdited({ materias: copy })
                  }}
                />
              ))}
              <button
                onClick={() => onUpdateEdited({
                  materias: [...c.materias, { nome: 'Nova matéria', topicos: [] }],
                })}
                className="text-xs text-brand-500 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar matéria
              </button>
            </div>
          </div>

          {/* Save button */}
          {!ui.saved && (
            <div className="border-t border-border pt-3">
              <button
                onClick={onSave}
                disabled={ui.saving || (ui.action === 'import' && !ui.selectedCourseId)}
                className="rounded-xl bg-green-500 text-white px-5 py-2 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
              >
                {ui.saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
                  : <><Save className="w-4 h-4" /> Salvar este cargo</>}
              </button>
              <p className="text-[10px] text-muted-foreground mt-1">
                Salva como edital ativo. Edital anterior do mesmo curso é desativado mas conteúdo (resumos, questões) é preservado.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MateriaCard({
  materia, knownSubjects, onUpdate, onRemove, onUpdateTopico, onRemoveTopico, onAddTopico,
}: {
  materia: Materia
  knownSubjects: KnownSubject[]
  onUpdate: (patch: Partial<Materia>) => void
  onRemove: () => void
  onUpdateTopico: (ti: number, patch: Partial<Topico>) => void
  onRemoveTopico: (ti: number) => void
  onAddTopico: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const matched = knownSubjects.find((s) => s.id === materia.subjectId)
  return (
    <div className="rounded-lg border border-border bg-card/30">
      <div className="flex items-center gap-2 p-2">
        <button onClick={() => setExpanded((v) => !v)} className="p-0.5 hover:bg-muted rounded">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <input value={materia.nome} onChange={(e) => onUpdate({ nome: e.target.value })}
          className="flex-1 bg-transparent font-semibold text-xs border-none outline-none" />
        <input
          type="number"
          placeholder="qts"
          value={materia.qtdQuestoes ?? ''}
          onChange={(e) => onUpdate({ qtdQuestoes: e.target.value ? Number(e.target.value) : null })}
          className="w-12 bg-muted/40 rounded px-1.5 py-0.5 text-[10px] text-center"
          title="Qtd questões"
        />
        <input
          type="number"
          step="0.1"
          placeholder="peso"
          value={materia.peso ?? ''}
          onChange={(e) => onUpdate({ peso: e.target.value ? Number(e.target.value) : null })}
          className="w-12 bg-muted/40 rounded px-1.5 py-0.5 text-[10px] text-center"
          title="Peso"
        />
        <select
          value={materia.subjectId ?? ''}
          onChange={(e) => onUpdate({ subjectId: e.target.value || undefined })}
          className="text-[10px] rounded-md border border-border bg-background px-1.5 py-0.5 max-w-[140px]"
        >
          <option value="">⚡ Nova</option>
          {knownSubjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {matched && <Check className="w-3 h-3 text-green-500" />}
        <span className="text-[10px] text-muted-foreground">{materia.topicos.length}</span>
        <button onClick={onRemove} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-0.5 rounded">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {expanded && (
        <div className="px-2 pb-2 space-y-0.5 border-t border-border pt-1.5">
          {materia.topicos.map((t, ti) => (
            <div key={ti} className="flex items-center gap-1 group">
              <span className="text-muted-foreground text-[10px] w-5 text-right">{ti + 1}.</span>
              <input
                value={t.nome}
                onChange={(e) => onUpdateTopico(ti, { nome: e.target.value })}
                className="flex-1 bg-transparent text-xs border-b border-transparent hover:border-border focus:border-brand-500 outline-none py-0.5"
              />
              {Array.isArray(t.subtopicos) && t.subtopicos.length > 0 && (
                <span className="text-[10px] text-muted-foreground">+{t.subtopicos.length}</span>
              )}
              <button onClick={() => onRemoveTopico(ti)} className="text-red-500 opacity-0 group-hover:opacity-100 p-0.5">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          <button onClick={onAddTopico} className="text-[10px] text-brand-500 hover:underline inline-flex items-center gap-0.5 mt-1">
            <Plus className="w-2.5 h-2.5" /> tópico
          </button>
        </div>
      )}
    </div>
  )
}
