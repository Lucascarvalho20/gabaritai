import Link from 'next/link'

export default function PrivacidadePage() {
  const sections = [
    {
      title: '1. Dados que coletamos',
      content: 'Coletamos: (a) dados de cadastro — nome, e-mail e senha; (b) dados de uso — questões respondidas, flashcards revisados, tempo de estudo, progresso no edital; (c) dados de IA — histórico de conversas com o Mentor IA e resumos gerados; (d) dados técnicos — tipo de dispositivo, navegador e endereço IP para segurança.',
    },
    {
      title: '2. Como usamos seus dados',
      content: 'Utilizamos seus dados para: personalizar o plano de estudos e as recomendações da IA; identificar pontos fracos e adaptar o cronograma; melhorar continuamente a plataforma; enviar lembretes e notificações de estudo (se autorizado); garantir a segurança da sua conta e da plataforma.',
    },
    {
      title: '3. Compartilhamento de dados',
      content: 'Não vendemos seus dados pessoais. Compartilhamos dados apenas com: (a) provedores de IA (Anthropic, OpenAI, Google) para processar as interações — conforme suas políticas de privacidade; (b) processadores de pagamento (Mercado Pago) para transações; (c) autoridades, quando exigido por lei. Todos os parceiros seguem padrões rigorosos de proteção de dados.',
    },
    {
      title: '4. Retenção de dados',
      content: 'Mantemos seus dados enquanto sua conta estiver ativa. Após cancelamento, dados são retidos por 90 dias para possível reativação, depois excluídos permanentemente. Dados anonimizados podem ser mantidos para análise estatística sem identificação pessoal.',
    },
    {
      title: '5. Seus direitos (LGPD)',
      content: 'Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a: acessar seus dados pessoais; corrigir dados incorretos; solicitar exclusão dos seus dados; revogar consentimento a qualquer momento; portabilidade dos dados; informação sobre compartilhamento. Para exercer seus direitos, acesse Configurações ou contate privacidade@gabaritai.com.br.',
    },
    {
      title: '6. Cookies e rastreamento',
      content: 'Utilizamos cookies essenciais para manter sua sessão ativa e cookies analíticos (anonimizados) para entender o uso da plataforma. Não utilizamos cookies de publicidade de terceiros. Você pode desativar cookies nas configurações do seu navegador, mas isso pode impactar o funcionamento da plataforma.',
    },
    {
      title: '7. Segurança',
      content: 'Adotamos medidas técnicas e organizacionais para proteger seus dados: criptografia TLS em todas as comunicações; senhas armazenadas com hash bcrypt; tokens JWT com expiração de 30 dias; logs de acesso para detecção de anomalias. Em caso de violação de dados, notificaremos os usuários afetados conforme exigido pela LGPD.',
    },
    {
      title: '8. Menores de idade',
      content: 'A plataforma é destinada a maiores de 16 anos. Não coletamos intencionalmente dados de menores de 16 anos. Se identificarmos cadastros nessa situação, as contas serão encerradas e os dados excluídos.',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-foreground">Política de Privacidade</h1>
          <p className="text-muted-foreground mt-2">Última atualização: maio de 2026 — Em conformidade com a LGPD (Lei nº 13.709/2018)</p>
        </div>

        {sections.map(({ title, content }) => (
          <div key={title} className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">{content}</p>
          </div>
        ))}

        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h2 className="font-bold text-foreground">Contato do encarregado de dados (DPO)</h2>
          <p className="text-sm text-muted-foreground">
            Para questões sobre privacidade e exercício de direitos LGPD: <a href="mailto:privacidade@gabaritai.com.br" className="text-brand-600 hover:underline">privacidade@gabaritai.com.br</a>
          </p>
        </div>

        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block">← Voltar ao início</Link>
      </div>
    </div>
  )
}
