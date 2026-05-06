import Link from 'next/link'

export default function TermosPage() {
  const sections = [
    {
      title: '1. Aceitação dos Termos',
      content: 'Ao acessar e utilizar a plataforma GabaritAI, você concorda com estes Termos de Uso. Se não concordar com qualquer disposição, não utilize nossos serviços. Estes termos podem ser atualizados periodicamente, e o uso continuado da plataforma após mudanças implica aceitação das novas condições.',
    },
    {
      title: '2. Descrição dos Serviços',
      content: 'O GabaritAI oferece uma plataforma de estudos com inteligência artificial para preparação em concursos públicos, incluindo: banco de questões, flashcards com repetição espaçada, simulados adaptativos, mentor IA, resumos gerados por IA e cronograma personalizado. Os dados e conteúdos são fornecidos para fins educacionais.',
    },
    {
      title: '3. Cadastro e Segurança',
      content: 'Você é responsável por manter a confidencialidade de suas credenciais de acesso. Não compartilhe sua senha com terceiros. Qualquer uso não autorizado da sua conta deve ser comunicado imediatamente. O GabaritAI não se responsabiliza por acessos não autorizados decorrentes de negligência do usuário.',
    },
    {
      title: '4. Planos e Pagamentos',
      content: 'Oferecemos plano gratuito com funcionalidades limitadas e planos pagos com acesso completo. Os valores são cobrados de acordo com o plano escolhido. Pagamentos são processados por plataformas seguras terceirizadas (Mercado Pago). Cancelamentos devem ser realizados antes do próximo ciclo de cobrança para evitar renovação automática.',
    },
    {
      title: '5. Política de Reembolso',
      content: 'Reembolsos são concedidos em até 7 dias após a compra, mediante solicitação pelo e-mail contato@gabaritai.com.br. Após esse período, não são realizados reembolsos. Para cancelamentos de assinatura mensal, o acesso permanece ativo até o fim do período já pago.',
    },
    {
      title: '6. Uso Adequado',
      content: 'É proibido: compartilhar credenciais de acesso; reproduzir, distribuir ou comercializar conteúdo da plataforma sem autorização; utilizar bots ou sistemas automatizados para acessar os serviços; tentar comprometer a segurança do sistema. Violações podem resultar no cancelamento imediato do acesso sem reembolso.',
    },
    {
      title: '7. Conteúdo Gerado por IA',
      content: 'A plataforma utiliza inteligência artificial (Claude/Anthropic, OpenAI e Google Gemini) para gerar respostas personalizadas. O conteúdo gerado pela IA é fornecido para fins educacionais e não substitui orientação profissional jurídica ou acadêmica. Sempre verifique informações críticas em fontes oficiais.',
    },
    {
      title: '8. Limitação de Responsabilidade',
      content: 'O GabaritAI não garante aprovação em concursos públicos. Os resultados dependem exclusivamente do esforço e dedicação do usuário. A plataforma pode apresentar indisponibilidades temporárias para manutenção. Não nos responsabilizamos por perdas decorrentes de uso inadequado da plataforma.',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-foreground">Termos de Uso</h1>
          <p className="text-muted-foreground mt-2">Última atualização: maio de 2026</p>
        </div>

        {sections.map(({ title, content }) => (
          <div key={title} className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">{content}</p>
          </div>
        ))}

        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h2 className="font-bold text-foreground">Contato</h2>
          <p className="text-sm text-muted-foreground">
            Dúvidas sobre estes termos? Entre em contato: <a href="mailto:contato@gabaritai.com.br" className="text-brand-600 hover:underline">contato@gabaritai.com.br</a>
          </p>
        </div>

        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block">← Voltar ao início</Link>
      </div>
    </div>
  )
}
