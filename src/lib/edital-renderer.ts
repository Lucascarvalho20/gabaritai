/**
 * Renderer do "edital verticalizado" pra envio por email.
 *
 * Gera HTML formatado (não PDF — concurseiro pode imprimir do email ou
 * guardar/encaminhar) com:
 *   - cabeçalho do concurso (órgão, cargo, banca, data prova)
 *   - dados-chave (vagas, salário, duração, redação, formato)
 *   - tabela de matérias com peso e qtd de questões
 *   - lista detalhada matéria → tópicos
 *   - CTA pra trial
 *
 * Se o curso não tiver edital ativo cadastrado, retorna um HTML genérico
 * informando que o edital "está em preparação" e oferecendo cadastrar
 * pra ser avisado.
 */

import { prisma } from '@/lib/prisma'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gabaritai-red.vercel.app'

const examFormatLabel: Record<string, string> = {
  CE: 'Certo/Errado',
  ME_5: 'Múltipla escolha (5 alternativas)',
  ME_4: 'Múltipla escolha (4 alternativas)',
  MISTA: 'Mista (CE + múltipla)',
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDuration(min: number | null | undefined): string {
  if (!min) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}

/**
 * Email base com styles inline (clientes de email não respeitam CSS externo).
 */
function wrapEmail(subject: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;color:#0f172a;line-height:1.5;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#3b82f6 0%,#10b981 100%);padding:24px;text-align:center;">
        <div style="color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Gabaritai</div>
        <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">Plataforma de mentoria para concursos militares e policiais</div>
      </div>
      <div style="padding:28px 24px;">
        ${contentHtml}
      </div>
      <!-- Footer -->
      <div style="background:#f8fafc;padding:20px 24px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b;">
        Você recebeu esse email porque solicitou o edital verticalizado no Gabaritai.<br>
        <a href="${BASE_URL}" style="color:#3b82f6;text-decoration:none;">gabaritai-red.vercel.app</a> ·
        <a href="${BASE_URL}/historias" style="color:#3b82f6;text-decoration:none;">Histórias</a> ·
        <a href="${BASE_URL}/blog" style="color:#3b82f6;text-decoration:none;">Blog</a>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Gera o email com o edital verticalizado de um curso específico.
 * Se courseSlug não bater com nenhum curso, ou curso não tem edital ativo,
 * cai em fallback "edital em preparação".
 */
export async function renderEditalEmail(courseSlug: string | null): Promise<{ subject: string; html: string; text: string }> {
  if (!courseSlug) {
    return renderEditalGenericoEmail()
  }

  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: {
      editais: {
        where: { isActive: true },
        include: {
          banca: { select: { name: true, slug: true } },
          subjects: {
            include: { subject: { select: { name: true, slug: true } } },
            orderBy: { order: 'asc' },
          },
        },
        take: 1,
      },
    },
  })

  if (!course) {
    return renderEditalGenericoEmail()
  }

  const edital = course.editais[0]
  const cargoLabel = course.cargo ?? course.name
  const orgaoLabel = course.orgao ?? course.name

  if (!edital) {
    // Curso existe mas sem edital ativo — fallback informando preparação
    return renderEditalEmPreparacao(orgaoLabel, cargoLabel)
  }

  // Busca tópicos de cada subject do edital
  const subjectsWithTopics = await Promise.all(
    edital.subjects.map(async (es) => {
      const topics = await prisma.topic.findMany({
        where: { subjectId: es.subjectId, parentId: null, archivedAt: null },
        select: { id: true, name: true, order: true },
        orderBy: { order: 'asc' },
        take: 20, // limita pra não explodir o email
      })
      return {
        subjectName: es.subject.name,
        weight: es.weight,
        expectedQuestions: es.expectedQuestions,
        topics,
      }
    }),
  )

  const subject = `Edital verticalizado · ${orgaoLabel} ${cargoLabel}${edital.ano ? ` ${edital.ano}` : ''}`

  // Soma de pesos pra calcular percentual
  const totalWeight = subjectsWithTopics.reduce((sum, s) => sum + (s.weight ?? 1), 0)

  const subjectsTableRows = subjectsWithTopics
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .map((s, i) => {
      const pct = totalWeight > 0 ? Math.round(((s.weight ?? 1) / totalWeight) * 100) : 0
      return `
        <tr style="${i % 2 === 0 ? 'background:#f8fafc;' : ''}">
          <td style="padding:8px 10px;font-weight:600;font-size:13px;">${escapeHtml(s.subjectName)}</td>
          <td style="padding:8px 10px;text-align:center;font-size:12px;color:#64748b;">${pct}%</td>
          <td style="padding:8px 10px;text-align:center;font-size:12px;color:#64748b;">${s.expectedQuestions ?? '—'}</td>
        </tr>`
    })
    .join('')

  const subjectsDetailedHtml = subjectsWithTopics
    .map((s) => {
      const topicsList = s.topics.length === 0
        ? '<li style="color:#94a3b8;font-style:italic;">Tópicos sendo cadastrados</li>'
        : s.topics.map((t) => `<li style="margin-bottom:4px;">${escapeHtml(t.name)}</li>`).join('')
      return `
        <div style="margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0;">
          <h3 style="font-size:14px;font-weight:700;margin:0 0 8px;color:#0f172a;">${escapeHtml(s.subjectName)}</h3>
          <ul style="margin:0;padding-left:20px;font-size:12px;color:#475569;">${topicsList}</ul>
        </div>`
    })
    .join('')

  const content = `
    <h1 style="font-size:22px;font-weight:800;margin:0 0 6px;color:#0f172a;letter-spacing:-0.3px;">
      ${escapeHtml(orgaoLabel)} · ${escapeHtml(cargoLabel)}
      ${edital.ano ? `<span style="color:#64748b;font-weight:600;">${edital.ano}</span>` : ''}
    </h1>
    <p style="font-size:14px;color:#64748b;margin:0 0 24px;">
      Aqui está seu edital verticalizado. Use ele pra montar seu cronograma e focar no que mais cai.
    </p>

    <!-- Dados-chave -->
    <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#f8fafc;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Banca</td>
        <td style="padding:12px;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(edital.banca?.name ?? '—')}</td>
      </tr>
      ${edital.vagas ? `<tr><td style="padding:12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Vagas</td><td style="padding:12px;font-size:13px;font-weight:600;text-align:right;border-top:1px solid #e2e8f0;">${edital.vagas}</td></tr>` : ''}
      ${edital.salario ? `<tr><td style="padding:12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Salário inicial</td><td style="padding:12px;font-size:13px;font-weight:600;text-align:right;border-top:1px solid #e2e8f0;">${fmtMoney(edital.salario)}</td></tr>` : ''}
      ${edital.totalQuestoes ? `<tr><td style="padding:12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Total de questões</td><td style="padding:12px;font-size:13px;font-weight:600;text-align:right;border-top:1px solid #e2e8f0;">${edital.totalQuestoes}</td></tr>` : ''}
      ${edital.duracaoMin ? `<tr><td style="padding:12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Duração</td><td style="padding:12px;font-size:13px;font-weight:600;text-align:right;border-top:1px solid #e2e8f0;">${fmtDuration(edital.duracaoMin)}</td></tr>` : ''}
      ${edital.examFormat ? `<tr><td style="padding:12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Formato</td><td style="padding:12px;font-size:13px;font-weight:600;text-align:right;border-top:1px solid #e2e8f0;">${escapeHtml(examFormatLabel[edital.examFormat as string] ?? edital.examFormat as string)}</td></tr>` : ''}
      <tr><td style="padding:12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Redação</td><td style="padding:12px;font-size:13px;font-weight:600;text-align:right;border-top:1px solid #e2e8f0;">${edital.hasRedacao ? 'Sim' : 'Não'}</td></tr>
      <tr><td style="padding:12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Errada anula certa?</td><td style="padding:12px;font-size:13px;font-weight:600;text-align:right;border-top:1px solid #e2e8f0;">${edital.wrongAnnulsRight ? 'Sim' : 'Não'}</td></tr>
      ${edital.dataProva ? `<tr><td style="padding:12px;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Data da prova</td><td style="padding:12px;font-size:13px;font-weight:600;text-align:right;border-top:1px solid #e2e8f0;">${fmtDate(edital.dataProva)}</td></tr>` : ''}
    </table>

    <!-- Tabela de matérias por peso -->
    <h2 style="font-size:16px;font-weight:700;margin:24px 0 12px;color:#0f172a;">Matérias por peso</h2>
    <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#0f172a;color:#fff;">
          <th style="padding:10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Matéria</th>
          <th style="padding:10px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:60px;">Peso</th>
          <th style="padding:10px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:80px;">Questões</th>
        </tr>
      </thead>
      <tbody>${subjectsTableRows}</tbody>
    </table>

    <!-- Conteúdo programático detalhado -->
    <h2 style="font-size:16px;font-weight:700;margin:28px 0 4px;color:#0f172a;">Conteúdo programático</h2>
    <p style="font-size:13px;color:#64748b;margin:0 0 16px;">Por matéria, os principais tópicos que caem.</p>
    ${subjectsDetailedHtml}

    <!-- CTA -->
    <div style="margin-top:32px;padding:24px;background:linear-gradient(135deg,#eff6ff 0%,#ecfdf5 100%);border-radius:12px;text-align:center;border:1px solid #dbeafe;">
      <h3 style="font-size:16px;font-weight:700;margin:0 0 8px;color:#0f172a;">Bora colocar isso em prática?</h3>
      <p style="font-size:13px;color:#475569;margin:0 0 16px;">No Gabaritai, esse edital vira cronograma automaticamente. Comece com 7 dias grátis, sem cartão.</p>
      <a href="${BASE_URL}/checkout/trial-7-dias" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:10px;font-weight:600;font-size:13px;text-decoration:none;">Começar trial de 7 dias</a>
    </div>
  `

  const html = wrapEmail(subject, content)
  const text = `${subject}\n\n${stripHtml(content)}\n\n— Equipe Gabaritai`

  return { subject, html, text }
}

function renderEditalGenericoEmail(): { subject: string; html: string; text: string } {
  const subject = 'Bem-vindo ao Gabaritai · seu primeiro passo'
  const content = `
    <h1 style="font-size:22px;font-weight:800;margin:0 0 6px;">Bem-vindo!</h1>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      Obrigado pelo interesse no Gabaritai. Pra te mandar o edital verticalizado do concurso específico,
      precisamos saber qual é. Cadastre-se com 7 dias grátis e a gente monta tudo no seu cronograma.
    </p>
    <div style="margin-top:24px;text-align:center;">
      <a href="${BASE_URL}/cursos" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:10px;font-weight:600;font-size:13px;text-decoration:none;">Ver concursos cobertos</a>
    </div>
  `
  return { subject, html: wrapEmail(subject, content), text: `${subject}\n\nBem-vindo ao Gabaritai. Acesse ${BASE_URL}/cursos pra escolher seu concurso.` }
}

function renderEditalEmPreparacao(orgao: string, cargo: string): { subject: string; html: string; text: string } {
  const subject = `Edital de ${orgao} ${cargo} · em preparação`
  const content = `
    <h1 style="font-size:20px;font-weight:800;margin:0 0 6px;">Estamos preparando seu edital</h1>
    <p style="font-size:14px;color:#475569;margin:0 0 12px;">
      Oi! O edital verticalizado de <strong>${escapeHtml(orgao)} ${escapeHtml(cargo)}</strong> ainda está sendo
      cadastrado pela nossa equipe. Em breve sai.
    </p>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      Enquanto isso, você pode começar pelo trial de 7 dias e escolher outro concurso ou aguardar — vamos te
      avisar nesse mesmo email quando o material ficar pronto.
    </p>
    <div style="margin-top:24px;text-align:center;">
      <a href="${BASE_URL}/cursos" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:10px;font-weight:600;font-size:13px;text-decoration:none;">Ver outros concursos</a>
    </div>
  `
  return { subject, html: wrapEmail(subject, content), text: `${subject}\n\nEdital sendo cadastrado. Acompanhe em ${BASE_URL}/cursos` }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}
