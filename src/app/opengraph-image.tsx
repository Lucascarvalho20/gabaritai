import { ImageResponse } from 'next/og'

/**
 * Imagem do card de compartilhamento (LinkedIn, WhatsApp, X).
 *
 * Tipográfica de propósito: o título real da home e três fatos do produto.
 * Peso único: a fonte embutida no renderizador do Next só tem o regular, e
 * pedir 800 aqui não muda nada — só faz o código prometer o que não entrega.
 * Sem mockup de dashboard e sem número inventado — o que aparece no card é o
 * que o site entrega.
 */
export const alt = 'Gabaritai — Sua farda começa com método. Cronograma pelo edital, simulados no formato da banca e repetição espaçada.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '72px 80px',
          background: '#0b1220', color: '#f8fafc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34,
          }}>G</div>
          <div style={{ fontSize: 34, letterSpacing: -0.5 }}>Gabaritai</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -2 }}>
            Sua farda começa
          </div>
          {/* Espaço como `gap` do flex: o renderizador de imagem descarta
              espaço e &nbsp; nas bordas de texto, e saía "commétodo." */}
          <div style={{ display: 'flex', gap: 22, fontSize: 76, lineHeight: 1.05, letterSpacing: -2 }}>
            <span>com</span>
            <span style={{ color: '#60a5fa' }}>método.</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 28, fontSize: 26, color: '#94a3b8' }}>
          <span>Cronograma pelo edital</span>
          <span style={{ color: '#334155' }}>|</span>
          <span>Simulados no formato da banca</span>
          <span style={{ color: '#334155' }}>|</span>
          <span>Repetição espaçada</span>
        </div>
      </div>
    ),
    size,
  )
}
