-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 11 — PMGO + Medicina Legal + Crimes Cibernéticos
-- Data: 2026-06-07
--
-- 4 materiais densos (DRAFT — aguarda revisão admin):
--  - PMGO: Estatuto Lei 8.033/75 + Sistema Defesa Social Lei 19.961/17
--  - Medicina Legal: Tanatologia + Traumatologia Forense (PF/PCDF Perito)
--  - Medicina Legal: Sexologia + Asfixiologia + Identificação (PF/PCDF Perito)
--  - Penal: Crimes Cibernéticos (Lei 12.737/12 + Marco Civil + LGPD + Budapeste)
--
-- IDEMPOTENTE. Preserva REVIEWED/PUBLISHED.
-- ════════════════════════════════════════════════════════════════════════════

DO $topics$
DECLARE v_subject_id text;
BEGIN
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-especial';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'PMGO — Estatuto (Lei 8.033/75) e Sistema de Defesa Social (Lei 19.961/17)', 'pmgo-estatuto-defesa-social', 1.5, 100, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'PMGO — Estatuto (Lei 8.033/75) e Sistema de Defesa Social (Lei 19.961/17)');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'medicina-legal';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Tanatologia e Traumatologia Forense', 'med-tanato-trauma', 1.5, 100, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Tanatologia e Traumatologia Forense');

    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Sexologia, Asfixiologia e Identificação Forense', 'med-sexo-asfixio-id', 1.4, 101, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Sexologia, Asfixiologia e Identificação Forense');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Crimes Cibernéticos (Lei 12.737/12 + Marco Civil + LGPD + Budapeste)', 'pen-crimes-ciberneticos', 1.4, 300, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Crimes Cibernéticos (Lei 12.737/12 + Marco Civil + LGPD + Budapeste)');
  END IF;
END $topics$;

CREATE OR REPLACE FUNCTION upsert_material(
  p_subject_slug text, p_topic_name text, p_title text, p_content text, p_resumo text
) RETURNS void AS $func$
DECLARE
  v_topic_id text; v_subject_id text; v_material_id text; v_cache_key text;
BEGIN
  SELECT t.id, t."subjectId" INTO v_topic_id, v_subject_id
  FROM "topics" t JOIN "subjects" s ON s.id = t."subjectId"
  WHERE s.slug = p_subject_slug AND t.name = p_topic_name LIMIT 1;
  IF v_topic_id IS NULL THEN
    RAISE NOTICE 'Tópico não encontrado: % / %', p_subject_slug, p_topic_name;
    RETURN;
  END IF;
  v_cache_key := 'topic-' || v_topic_id;
  INSERT INTO "materials" (id, "subjectId", "topicId", "cacheKey", title, type, content, active, status, origin, "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, v_subject_id, v_topic_id, v_cache_key, p_title, 'TEXTO', p_content, true, 'DRAFT', 'ai', NOW(), NOW())
  ON CONFLICT ("cacheKey") DO UPDATE SET
    title = EXCLUDED.title, content = EXCLUDED.content,
    status = CASE WHEN "materials".status IN ('REVIEWED', 'PUBLISHED') THEN "materials".status ELSE 'DRAFT'::"MaterialStatus" END,
    "updatedAt" = NOW()
  RETURNING id INTO v_material_id;
  IF v_material_id IS NULL THEN
    SELECT id INTO v_material_id FROM "materials" WHERE "cacheKey" = v_cache_key;
  END IF;
  INSERT INTO "material_resumos" (id, "materialId", resumo, "generatedBy", "generatedAt")
  VALUES (gen_random_uuid()::text, v_material_id, p_resumo, 'ai', NOW())
  ON CONFLICT ("materialId") DO UPDATE SET resumo = EXCLUDED.resumo, "generatedAt" = NOW();
END;
$func$ LANGUAGE plpgsql;

-- ┌─ 1. PMGO — Estatuto + Sistema Defesa Social ─────────────────────────────┐
SELECT upsert_material(
  'legislacao-especial',
  'PMGO — Estatuto (Lei 8.033/75) e Sistema de Defesa Social (Lei 19.961/17)',
  'PMGO — Estatuto (Lei 8.033/75) e Sistema de Defesa Social (Lei 19.961/17)',
$content$
# PMGO — Estatuto e Sistema de Defesa Social

Bloco principal de legislação específica pra PMGO Soldado. Banca AOCP cobra DIRETO da letra da lei.

## 1. Lei 8.033/75 — Estatuto dos Militares Estaduais (PMGO)

### 1.1. Disposições Preliminares

- **Polícia Militar de Goiás** é instituição organizada com base na **hierarquia e na disciplina** sob a autoridade suprema do Governador.
- Vinculada à Secretaria de Segurança Pública (hoje Secretaria de Segurança Pública e Administração Penitenciária).
- **Hierarquia**: ordenação da autoridade em níveis hierárquicos.
- **Disciplina**: rigorosa observância e o acatamento integral das leis, regulamentos, normas e ordens.

### 1.2. Postos e Graduações (Arts. 7º-10)

**Oficiais**:
- Coronel.
- Tenente-Coronel.
- Major.
- Capitão.
- 1º Tenente.
- 2º Tenente.
- Aspirante a Oficial.

**Praças**:
- Subtenente.
- 1º Sargento.
- 2º Sargento.
- 3º Sargento.
- Cabo.
- **Soldado** (1ª e 2ª classe).

### 1.3. Antiguidade

- Posto/graduação.
- Tempo no posto/graduação.
- Tempo de efetivo serviço.
- Tempo no posto antecedente.

### 1.4. Direitos do Militar (Arts. 50-90)

- Soldo, gratificações, indenizações.
- Férias anuais.
- Licenças (especial, prêmio, para tratamento, casamento, gestante, paternidade, nojo).
- Promoção (antiguidade, merecimento, post mortem).
- Estabilidade após 10 anos de efetivo serviço para praças.
- Inatividade (reserva remunerada, reforma).
- Pensão militar.

### 1.5. Deveres e Ética (Arts. 27-49)

- Probidade, lealdade, dedicação.
- Cumprimento de ordens superiores **NÃO manifestamente ilegais**.
- Manter conduta exemplar (mesmo fora de serviço).
- Defender a Constituição e as instituições.

### 1.6. Transgressões Disciplinares (RDPMGO)

- **Leves**: até 8 dias de detenção.
- **Médias**: 9 a 15 dias de detenção.
- **Graves**: 16 a 30 dias de prisão + processo administrativo.

Penalidades:
- Advertência.
- Repreensão.
- Detenção.
- Prisão.
- Licenciamento a bem da disciplina.
- Demissão.
- Reforma disciplinar.

### 1.7. Conselhos

- **Conselho de Justificação**: oficial cuja conduta é alvo de apuração.
- **Conselho de Disciplina**: praças com estabilidade.

### 1.8. Inatividade

**Reforma** (compulsória):
- Idade limite no posto.
- Incapacidade definitiva.
- Punição.

**Reserva Remunerada**:
- A pedido (com tempo).
- Ex-officio (idade ou tempo).

### 1.9. Soldado da PMGO — Particularidades

- Estagiário durante o curso de formação.
- Após conclusão: Soldado Combatente.
- 1ª classe → 2ª classe (promoção).
- Estabilidade após 10 anos de efetivo serviço.

## 2. Lei 19.961/17 — Sistema de Defesa Social

### 2.1. Conceito e Composição

Sistema de Defesa Social do Estado de Goiás (SDS-GO): conjunto **integrado de órgãos** que atuam de forma articulada para garantir a segurança pública.

**Órgãos integrantes**:
- Polícia Civil.
- **Polícia Militar (PMGO)**.
- Corpo de Bombeiros Militar (CBMGO).
- Superintendência de Polícia Técnico-Científica.
- Secretaria de Estado da Segurança Pública e Administração Penitenciária.
- Administração Penitenciária.

### 2.2. Princípios

- Garantia da ordem pública e da paz social.
- Atendimento integrado ao cidadão.
- Cooperação e integração entre os órgãos.
- Profissionalização e valorização dos servidores.
- Transparência e controle social.
- Tecnologia e inteligência aplicada à segurança.

### 2.3. Diretrizes

- **Inteligência integrada**: compartilhamento de informações.
- **Policiamento orientado para problemas**.
- **Integração com Município e União**.
- **Prevenção** como eixo central.
- **Atendimento humanizado**.

### 2.4. Órgãos colegiados

- **Conselho Estadual de Segurança Pública**.
- **Conselhos Municipais de Segurança Pública**.

### 2.5. Carreiras

- Estruturadas em postos e graduações.
- Concurso público para ingresso.
- Curso de formação obrigatório.

## 3. Como AOCP cobra

- **C/E**: "Soldado PMGO obtém estabilidade após 5 anos de serviço" → **ERRADO** (10 anos).
- **C/E**: "Transgressão grave admite prisão de até 30 dias" → **CORRETO** (RDPMGO).
- **C/E**: "Sistema de Defesa Social inclui Ministério Público" → **ERRADO** (MP não integra — é órgão de controle externo).
- **C/E**: "Conselho de Justificação é para praças" → **ERRADO** (para oficiais; praças = Conselho de Disciplina).
- **C/E**: "Hierarquia + disciplina são pilares constitucionais das PMs" → **CORRETO** (CF 42, §1º; CF 142, §3º aplicado por extensão).
$content$,
$resumo$
# Resumo — PMGO Estatuto + Defesa Social

## Lei 8.033/75 — Estatuto PMGO

**Pilares**: Hierarquia + Disciplina.

### Postos e graduações
Oficiais: Coronel → 2º Ten → Aspirante.
Praças: Subten → 1/2/3 Sgt → Cabo → **Soldado** (1ª/2ª classe).

### Direitos
Soldo, férias, licenças (especial, prêmio, etc), promoção, **estabilidade após 10 anos**.

### Transgressões
- Leves: até 8 dias detenção.
- Médias: 9-15 dias.
- Graves: 16-30 dias prisão + PAD.

### Penalidades
Advertência → Repreensão → Detenção → Prisão → Licenciamento → Demissão → Reforma disciplinar.

### Conselhos
- **Justificação**: oficiais.
- **Disciplina**: praças com estabilidade.

### Inatividade
Reforma (compulsória) + Reserva Remunerada (a pedido / ex-officio).

## Lei 19.961/17 — Sistema Defesa Social GO

### Órgãos integrantes
PCGO, **PMGO**, CBMGO, Polícia Técnico-Científica, Sec. Seg. Pública, Adm. Penitenciária.
⚠️ MP NÃO integra.

### Princípios
Ordem pública, atendimento integrado, cooperação, profissionalização, transparência, tecnologia.

### Diretrizes
Inteligência integrada, policiamento por problemas, prevenção, atendimento humanizado.

## Top pegadinhas AOCP

1. Estabilidade Soldado = 10 anos.
2. Justificação = oficiais; Disciplina = praças.
3. MP NÃO integra SDS-GO.
4. Hierarquia + disciplina = pilares constitucionais.
$resumo$
);

-- ┌─ 2. MEDICINA LEGAL — Tanatologia + Traumatologia ────────────────────────┐
SELECT upsert_material(
  'medicina-legal',
  'Tanatologia e Traumatologia Forense',
  'Medicina Legal — Tanatologia e Traumatologia Forense',
$content$
# Medicina Legal — Tanatologia e Traumatologia Forense

Dois temas pilares. Cebraspe ama tabela de fenômenos cadavéricos e classificação de agentes lesivos.

## 1. Tanatologia Forense

### 1.1. Conceito

Estudo da morte e dos fenômenos pós-morte com finalidade jurídica.

### 1.2. Tipos de morte

- **Morte real**: cessação irreversível de todas as funções vitais (cerebral, cardiorrespiratória).
- **Morte aparente**: redução acentuada das funções vitais simulando morte.
- **Morte súbita**: rápida, inesperada, em pessoa aparentemente saudável.
- **Morte agônica**: progressiva, com sofrimento.
- **Morte natural** vs **violenta** (homicídio, suicídio, acidente).

### 1.3. Diagnóstico da morte

- Critério clássico: cessação cardiorrespiratória.
- Critério atual: **morte encefálica** (Lei 9.434/97 + Resolução CFM 2.173/17).

### 1.4. Fenômenos cadavéricos

#### A) Abióticos imediatos (logo após a morte)
- **Cessação da consciência**.
- **Imobilidade**.
- **Perda do tônus muscular** (relaxamento esfincteriano).
- **Insensibilidade**.
- **Apneia, parada cardíaca**.
- **Pupila** sem reflexos.

#### B) Abióticos consecutivos (horas após)
- **Algidez cadavérica**: resfriamento progressivo (≈ 1ºC/hora nas primeiras horas).
- **Livores cadavéricos** (hipostáticos): manchas violáceas pelo acúmulo de sangue nas regiões em declive — surgem 1-3h após morte, fixos após 12h. Indicam posição do corpo.
- **Rigidez cadavérica**: rigor mortis — endurece progressivamente entre 1-12h, dissipa entre 24-48h. Fórmula: face → tronco → membros (descendente). Resolução na ordem inversa.
- **Desidratação**: ressecamento de mucosas e pele.

#### C) Transformativos (dias/semanas após)
- **Autólise**: digestão pelas próprias enzimas.
- **Putrefação**: ação bacteriana, em fases:
  1. **Cromática** (mancha verde abdominal) — 24-48h.
  2. **Enfisematosa** (gases, distensão).
  3. **Coliquativa** (liquefação).
  4. **Esqueletização**.
- **Maceração**: em meio líquido (afogados).

#### D) Transformativos conservadores
- **Mumificação**: ambiente seco e quente — preserva o corpo desidratado.
- **Saponificação** (adipocera): meio úmido e anaeróbio — gordura vira sabão.
- **Calcificação**: depósitos de cálcio.
- **Corificação**: caixões metálicos lacrados.

### 1.5. Cronotanatognose

Estimar o tempo de morte por:
- Temperatura corporal.
- Estágio dos livores.
- Rigidez muscular.
- Putrefação.

### 1.6. Causa jurídica da morte

- **Natural**: doença ou senilidade.
- **Violenta**:
  - **Homicídio**.
  - **Suicídio**.
  - **Acidental**.
- **Indeterminada**: quando não se conclui.

## 2. Traumatologia Forense

### 2.1. Conceito

Estudo das **lesões corporais** sob o ponto de vista jurídico, independentemente do agente que as produziu.

### 2.2. Tipos de agentes lesivos

**A) Agentes mecânicos**:
- **Perfurantes**: ponta + cabo (objeto fino) → orifício pequeno (agulha, prego).
- **Cortantes**: gume (faca, lâmina) → ferida linear, bordas regulares.
- **Contundentes**: superfície + força (martelo, soco) → escoriação, equimose, hematoma, fratura.
- **Pérfuro-cortantes**: ponta + gume (faca, punhal) → ferida com cauda + bordas regulares.
- **Pérfuro-contundentes**: ponta + impacto (projétil de arma de fogo).
- **Corto-contundentes**: gume + peso (machado, foice) → ferida grande, bordas irregulares.

**B) Físicos**:
- Calor: queimaduras (1º, 2º, 3º, 4º graus — Wallace 9+9+18+18+18+18+18+1).
- Frio: hipotermia, ulcerações pelo frio.
- Eletricidade: marca elétrica de Jellinek.
- Pressão: barotrauma.
- Som/luz/radiação.

**C) Químicos**:
- Cáusticos (ácidos, bases).
- Tóxicos.

**D) Biológicos**:
- Microrganismos.
- Veneno animal.

**E) Mistos**: combinação.

### 2.3. Lesões em particular

#### Equimose
- Sangue no tecido subcutâneo. Não some à digitopressão.
- Evolução cromática: vermelha → arroxeada → azulada → esverdeada → amarelada → desaparece.

#### Escoriação
- Lesão por atrito; perda da camada superficial da pele.

#### Hematoma
- Coleção de sangue intersticial maior; elevação.

#### Ferida incisa
- Bordas regulares, extremidades em ângulo agudo (cauda).

#### Ferida pérfuro-cortante
- Bordas regulares, cauda na saída do instrumento.

#### Ferida contusa
- Bordas irregulares, "em cratera".

#### Ferida por projétil de arma de fogo
- **Entrada**: orifício circular/ovalado + halo de Fisch (limpadura + enxugo + contusão).
- **Trajeto**.
- **Saída** (se houver): orifício maior, bordas evertidas, sem halo.

### 2.4. Classificação penal das lesões (CP 129)

- **Leve**: pena 3m a 1a.
- **Grave** (§1º): incapacidade > 30 dias, perda/inutilização de membro, deformidade permanente, aborto.
- **Gravíssima** (§2º): incapacidade permanente para trabalho, enfermidade incurável, deformidade permanente, perda/inutilização de membro/sentido, gravidez.
- **Seguida de morte** (§3º): pena 4-12 anos.

## 3. Como Cebraspe cobra

- **C/E livores**: "Livores se fixam imediatamente após a morte" → **ERRADO** (12h aprox).
- **C/E rigidez**: "Rigidez cadavérica é ascendente (membros → tronco → face)" → **ERRADO** (descendente: face → tronco → membros).
- **C/E mumificação**: "Saponificação ocorre em ambiente seco" → **ERRADO** (úmido e anaeróbio).
- **C/E lesão entrada**: "Orifício de entrada de projétil tem bordas evertidas" → **ERRADO** (saída).
- **C/E lesão grave**: "Incapacidade de 20 dias caracteriza lesão grave" → **ERRADO** (> 30 dias).
$content$,
$resumo$
# Resumo — Tanatologia + Traumatologia

## Fenômenos cadavéricos

### Abióticos imediatos
Inconsciência, imobilidade, parada cardiorrespiratória, pupilas sem reflexo.

### Abióticos consecutivos (horas)
- Algidez (~1ºC/h).
- Livores: 1-3h surgem, fixos 12h+.
- Rigidez: 1-12h aparece, 24-48h dissipa. **DESCENDENTE** (face → tronco → membros).
- Desidratação.

### Transformativos (dias)
- Autólise (auto-digestão).
- Putrefação: cromática → enfisematosa → coliquativa → esqueletização.
- Maceração (líquido).

### Conservadores
- Mumificação: seco + quente.
- Saponificação: úmido + anaeróbio → adipocera.
- Calcificação, corificação.

## Agentes lesivos

| Agente | Característica |
|---|---|
| Perfurante | Ponta — orifício pequeno |
| Cortante | Gume — ferida linear regular |
| Contundente | Força — equimose, hematoma, fratura |
| Pérfuro-cortante | Faca — cauda + bordas regulares |
| Pérfuro-contundente | Arma de fogo |
| Corto-contundente | Machado — ferida grande irregular |

## Lesões CP 129

- Leve: 3m-1a.
- Grave (§1): >30 dias incap, perda membro, deformidade.
- Gravíssima (§2): incap permanente, enfermidade incurável, perda sentido, gravidez.
- Morte (§3): 4-12 anos.

## PAF — entrada x saída

| | Entrada | Saída |
|---|---|---|
| Forma | Circular/oval | Irregular |
| Bordas | Halo de Fisch | Evertidas |
| Tamanho | Menor | Maior |

## Top pegadinhas Cebraspe

1. Rigidez é DESCENDENTE.
2. Livores fixam em ~12h.
3. Saponificação = úmido + anaeróbio.
4. Halo de Fisch = ENTRADA.
5. Lesão grave: > 30 dias incapacidade.
$resumo$
);

-- ┌─ 3. MEDICINA LEGAL — Sexologia + Asfixiologia + Identificação ───────────┐
SELECT upsert_material(
  'medicina-legal',
  'Sexologia, Asfixiologia e Identificação Forense',
  'Medicina Legal — Sexologia, Asfixiologia e Identificação Forense',
$content$
# Medicina Legal — Sexologia, Asfixiologia e Identificação Forense

## 1. Sexologia Forense

### 1.1. Conceito

Estuda os aspectos médico-legais relacionados à sexualidade, em especial **crimes contra a dignidade sexual** (CP 213-218).

### 1.2. Crimes contra dignidade sexual

- **Estupro** (213): constranger alguém à conjunção carnal OU outro ato libidinoso. Pena 6-10 anos.
- **Estupro de vulnerável** (217-A): vítima < 14 anos, enferma mental ou impossibilitada. Pena 8-15 anos.
- **Importunação sexual** (215-A): ato libidinoso sem consentimento. Pena 1-5 anos.
- **Violação sexual mediante fraude** (215).

### 1.3. Conjunção carnal vs outro ato libidinoso

- **Conjunção carnal**: introdução do pênis na vagina.
- **Outro ato libidinoso**: qualquer outro ato com finalidade sexual (sexo anal/oral, toques, etc.).

### 1.4. Exame de conjunção carnal

Verifica:
- Integridade do hímen.
- Lesões na região genital.
- Presença de espermatozoides (vivos/mortos).
- DNA para identificação.

### 1.5. Hímen

- **Anatômico**: anel membranoso na entrada vaginal.
- **Complacente**: pode permitir conjunção sem ruptura.
- **Roto**: rotura recente (sinais de sangramento, edema) ou antiga (cicatrização).

### 1.6. Gravidez e aborto

- **Gravidez forense**: comprovação de gestação para fins jurídicos (estupro, paternidade, etc.).
- **Aborto**:
  - **Espontâneo**: por causa natural.
  - **Provocado/criminoso** (CP 124-127).
  - **Legal/terapêutico** (CP 128): risco de vida da gestante OU estupro OU anencéfalo (STF ADPF 54).

### 1.7. Crimes de pedofilia (ECA)

- **Art. 240 ECA**: produzir cena de sexo explícito com criança/adolescente.
- **Art. 241 ECA**: armazenar, divulgar.
- **Art. 241-A**: oferecer, transmitir.
- **Art. 241-B**: posse de material pornográfico infantil.

## 2. Asfixiologia Forense

### 2.1. Conceito

Asfixia = dificuldade ou impossibilidade de respirar, levando à morte por anóxia.

### 2.2. Sinais gerais da asfixia

- **Cianose**: coloração azulada (especialmente face).
- **Manchas de Tardieu**: petéquias hemorrágicas em pleura, pericárdio.
- **Sangue fluido escuro**.
- **Congestão pulmonar**.
- **Cogumelo de espuma**: nariz/boca (afogamento).

### 2.3. Tipos de asfixia mecânica

#### A) Enforcamento
- Constrição do pescoço pelo peso do próprio corpo via laço.
- **Sulco**: oblíquo ascendente, mais profundo na frente.
- Sinais: protrusão da língua, livores em MMII, equimoses palpebrais.
- **Tipicamente SUICÍDIO** (mas não exclusivo).

#### B) Estrangulamento
- Constrição por laço, mãos ou força externa.
- **Sulco**: horizontal, em volta do pescoço.
- Lesões cervicais (fratura osso hioide).
- **Tipicamente HOMICÍDIO**.

#### C) Esganadura
- Constrição com as mãos do agressor.
- Equimoses digitiformes + escoriações ungueais.
- **EXCLUSIVAMENTE HOMICÍDIO** (não dá pra fazer em si mesmo).

#### D) Sufocação
- Obstrução das vias aéreas (boca, nariz) — direta ou por objetos.

#### E) Afogamento
- Imersão em líquido.
- Sinais: cogumelo de espuma, edema pulmonar, areia/lodo nos brônquios.

#### F) Soterramento
- Sepultamento sob terra/material.

#### G) Confinamento
- Espaço fechado sem ar (ex: criança em geladeira).

### 2.4. Diferenças críticas

| Tipo | Sulco | Etiologia comum |
|---|---|---|
| Enforcamento | Oblíquo ascendente, irregular | Suicídio |
| Estrangulamento | Horizontal, uniforme | Homicídio |
| Esganadura | Sem sulco — equimoses digitiformes | Homicídio exclusivo |

## 3. Identificação Forense

### 3.1. Conceito

Conjunto de processos para reconhecer uma pessoa.

### 3.2. Métodos

#### A) Antropometria (Bertillon)
- Medidas corporais (esqueleto, crânio).
- Em desuso.

#### B) Papiloscopia (Vucetich)
- Datiloscopia (digitais), quiroscopia (palmas), podoscopia (plantas).
- Padrões: arco, presilha (interna/externa), verticilo.
- Sistema brasileiro: Vucetich.

#### C) Odontologia legal
- Arcada dentária (única como digital).
- Identificação de cadáver carbonizado/decomposto.
- Estimativa de idade.

#### D) DNA
- Padrão-ouro atual.
- Banco Nacional de Perfis Genéticos (Lei 12.654/12).
- Coleta obrigatória em crimes hediondos.

#### E) Identificação por imagem
- Reconhecimento facial.
- Comparação fotográfica.

### 3.3. Antropologia forense

- Estimativa de **idade** (suturas cranianas, dentição).
- **Sexo** (pelve, crânio).
- **Estatura** (ossos longos — Fórmula de Trotter).
- **Ancestralidade**.

### 3.4. Documentos médico-legais

- **Laudo**: emitido por perito após exame, com finalidade processual.
- **Parecer**: opinião técnica.
- **Atestado**: declaração simples (saúde, óbito).
- **Relatório**: descrição detalhada.

## 4. Como Cebraspe cobra

- **C/E enforcamento**: "Sulco do enforcamento é horizontal" → **ERRADO** (oblíquo ascendente).
- **C/E esganadura**: "Esganadura pode ser autoinfligida" → **ERRADO** (exclusivamente homicídio).
- **C/E estupro**: "Estupro de vulnerável exige idade da vítima ≤ 12 anos" → **ERRADO** (< 14 anos).
- **C/E identificação**: "DNA substitui completamente outros métodos" → **ERRADO** (complementa).
- **C/E hímen**: "Conjunção carnal sempre rompe o hímen" → **ERRADO** (hímen complacente).
- **C/E afogamento**: "Cogumelo de espuma é sinal de enforcamento" → **ERRADO** (afogamento).
$content$,
$resumo$
# Resumo — Sexologia + Asfixiologia + Identificação

## Sexologia

- **Estupro** (213): 6-10 anos.
- **Estupro vulnerável** (217-A): < 14 anos / enfermo. 8-15 anos.
- **Importunação sexual** (215-A): 1-5 anos.
- Conjunção carnal x ato libidinoso.
- Hímen complacente: permite conjunção sem rotura.
- Aborto legal (CP 128): risco vida + estupro + anencéfalo (STF).

## Asfixias

| Tipo | Sulco | Etiologia |
|---|---|---|
| Enforcamento | OBLÍQUO ASCENDENTE | Suicídio (típ) |
| Estrangulamento | HORIZONTAL | Homicídio |
| Esganadura | Sem sulco — digitiformes | HOMICÍDIO EXCLUSIVO |
| Sufocação | Obstrução VA | Varia |
| Afogamento | Cogumelo de espuma | Varia |

### Sinais gerais
Cianose, Manchas de Tardieu, sangue fluido escuro, congestão pulmonar.

## Identificação

- **Datiloscopia**: arco, presilha (I/E), verticilo. Sistema Vucetich.
- **Odontologia legal**: arcada única.
- **DNA**: padrão-ouro. Banco Nacional (Lei 12.654/12).
- **Antropologia**: idade (suturas/dentição), sexo (pelve/crânio), estatura (Trotter).

## Documentos médico-legais

Laudo (perito) > Parecer (opinião) > Atestado (declaração) > Relatório (descrição).

## Top pegadinhas Cebraspe

1. Sulco enforcamento = OBLÍQUO ASCENDENTE.
2. Esganadura = SÓ homicídio.
3. Estupro vulnerável < 14 anos.
4. Hímen complacente permite conjunção.
5. Cogumelo de espuma = afogamento.
6. Aborto: anencéfalo legal (STF ADPF 54).
$resumo$
);

-- ┌─ 4. PENAL — Crimes Cibernéticos ─────────────────────────────────────────┐
SELECT upsert_material(
  'direito-penal',
  'Crimes Cibernéticos (Lei 12.737/12 + Marco Civil + LGPD + Budapeste)',
  'Crimes Cibernéticos — Lei 12.737/12, Marco Civil, LGPD e Convenção de Budapeste',
$content$
# Crimes Cibernéticos — Lei 12.737/12, Marco Civil, LGPD e Convenção de Budapeste

Tema EM ALTA em concursos modernos. PF Delegado, PCDF Delegado/Perito, MPU cobram cada vez mais.

## 1. Lei 12.737/12 — "Lei Carolina Dieckmann"

### 1.1. Contexto

Criou o **crime de invasão de dispositivo informático** (CP 154-A) após o vazamento de fotos íntimas da atriz.

### 1.2. Invasão de dispositivo informático (CP 154-A)

**Caput**: invadir dispositivo informático alheio, conectado ou não a rede, mediante violação indevida de mecanismo de segurança e com o fim de obter, adulterar ou destruir dados.

- **Pena**: 1 a 4 anos + multa (após Lei 14.155/21).
- **§1º — Aumento de 1/3 a 2/3**: se decorre prejuízo econômico.
- **§2º — Reclusão 2 a 5 anos + multa**: divulgação, comércio ou transmissão.
- **§3º — Causa de aumento**: contra Presidente da República, Governador, Prefeito, Ministros (1/3 a 1/2).
- **Crime AÇÃO PENAL CONDICIONADA À REPRESENTAÇÃO** (regra), salvo se vítima for pessoa jurídica de direito público.

### 1.3. Outros artigos modificados

- **CP 266**: interrupção/perturbação de serviço telegráfico/informático/telemático.
- **CP 298 parágrafo único**: falsificação de cartão (incluído).

### 1.4. Lei 14.155/21 — Endurecimento

- Aumentou penas.
- Acrescentou o **golpe digital** (CP 171 §2º-A — estelionato eletrônico).
- Aumento de pena em estelionato cometido por meio de dispositivo informático.

## 2. Marco Civil da Internet — Lei 12.965/14

### 2.1. Princípios (art. 3º)

- Garantia da liberdade de expressão.
- Proteção da privacidade.
- Proteção dos dados pessoais.
- Preservação e garantia da neutralidade de rede.
- Preservação da estabilidade, segurança e funcionalidade.
- Responsabilização dos agentes de acordo com suas atividades.
- Preservação da natureza participativa.
- Liberdade dos modelos de negócios.

### 2.2. Direitos do usuário (art. 7º)

- Inviolabilidade da intimidade.
- Inviolabilidade do sigilo das comunicações.
- Não suspensão da conexão (salvo débito).
- Informações claras sobre coleta de dados.
- Consentimento expresso para coleta.
- Não fornecimento a terceiros sem autorização.

### 2.3. Neutralidade de rede (art. 9º)

- Responsável pela transmissão deve tratar pacotes de forma isonômica.
- Vedada discriminação por conteúdo, origem, destino, terminal.

### 2.4. Guarda de registros

- **Registros de conexão** (art. 13): provedores de conexão guardam por **1 ano**.
- **Registros de acesso a aplicações** (art. 15): provedores de aplicação guardam por **6 meses**.

### 2.5. Responsabilidade dos provedores

- **Provedor de conexão** (art. 18): NÃO responde por conteúdo de terceiros.
- **Provedor de aplicações** (art. 19): responde por danos APÓS ordem judicial específica e descumprida.
- **Conteúdo de cunho sexual privado** (art. 21): responsabilidade subjetiva mesmo sem ordem judicial — basta notificação pelo participante ou representante legal.

### 2.6. Requisições

- Autoridade administrativa pode requisitar registros de conexão e acesso a aplicações com **autorização judicial** (regra).
- Exceção (art. 11): em algumas hipóteses específicas, sem ordem judicial.

## 3. LGPD — Lei 13.709/18

### 3.1. Objeto

Tratamento de **dados pessoais** por pessoas físicas e jurídicas, em qualquer meio.

### 3.2. Conceitos (art. 5º)

- **Dado pessoal**: informação relacionada a pessoa natural identificada ou identificável.
- **Dado pessoal sensível**: dado pessoal sobre origem racial, convicção religiosa, opinião política, filiação a sindicato, saúde, vida sexual, dado genético/biométrico.
- **Titular**: pessoa natural.
- **Controlador**: a quem competem decisões sobre tratamento.
- **Operador**: realiza tratamento em nome do controlador.
- **Encarregado (DPO)**: pessoa indicada para canal de comunicação.

### 3.3. Princípios (art. 6º)

Finalidade, adequação, necessidade, livre acesso, qualidade dos dados, transparência, segurança, prevenção, não-discriminação, responsabilização e prestação de contas.

### 3.4. Bases legais (art. 7º)

Tratamento só permitido com:
- Consentimento.
- Cumprimento de obrigação legal.
- Pela administração pública.
- Para pesquisa.
- Para execução de contrato.
- Para exercício regular de direitos em processo.
- Para proteção da vida.
- Para tutela da saúde.
- Para legítimo interesse.
- Para proteção do crédito.

### 3.5. Direitos do titular (art. 18)

Confirmação, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação, revogação de consentimento.

### 3.6. Sanções (art. 52)

- Advertência.
- Multa simples (até **2% do faturamento** OU R$ 50 milhões).
- Multa diária.
- Publicização da infração.
- Bloqueio ou eliminação dos dados.

### 3.7. ANPD

Autoridade Nacional de Proteção de Dados — fiscaliza e aplica sanções.

## 4. Convenção de Budapeste — Decreto 11.491/23

### 4.1. Contexto

Brasil aderiu em 2023. Primeiro tratado internacional sobre crimes cibernéticos.

### 4.2. Tipificações

A Convenção exige criminalização de:
- Acesso ilícito a sistema.
- Interceptação ilícita.
- Interferência em dados/sistema.
- Uso indevido de dispositivos.
- Falsificação informática.
- Fraude informática.
- Pornografia infantil online.
- Violação de direitos autorais.

### 4.3. Cooperação internacional

- Compartilhamento de informações.
- Auxílio mútuo em investigações.
- Preservação rápida de dados.

## 5. Lei 13.718/18 — Crimes sexuais online

- Importunação sexual (215-A).
- Divulgação de cena de estupro/nudez sem consentimento (CP 218-C).

## 6. Outras leis cibernéticas relevantes

- **Lei 12.965/14** — Marco Civil (acima).
- **Lei 13.709/18** — LGPD (acima).
- **Lei 12.965/14 + Lei 14.063/20** — assinatura eletrônica.
- **Lei 14.460/22** — política nacional cibersegurança.

## 7. Como Cebraspe cobra

- **C/E**: "Invasão de dispositivo informático (CP 154-A) é crime de ação penal pública incondicionada" → **ERRADO** (condicionada à representação, salvo PJ pública).
- **C/E Marco Civil**: "Provedor de conexão responde por conteúdo de terceiros" → **ERRADO** (não responde — art. 18).
- **C/E guarda**: "Registros de conexão devem ser guardados por 6 meses" → **ERRADO** (1 ano).
- **C/E LGPD sensível**: "Origem racial é dado pessoal comum" → **ERRADO** (sensível).
- **C/E LGPD multa**: "Multa LGPD limita-se a R$ 50 milhões por infração" → **CORRETO** (e/ou 2% do faturamento).
- **C/E Budapeste**: "Brasil não aderiu à Convenção de Budapeste" → **ERRADO** (Decreto 11.491/23).
$content$,
$resumo$
# Resumo — Crimes Cibernéticos

## Lei 12.737/12 + 14.155/21

### Invasão de dispositivo (CP 154-A)
- Pena: 1-4 anos + multa.
- Divulgação: 2-5 anos.
- Aumento: prejuízo econômico (1/3-2/3); vítima alta autoridade (1/3-1/2).
- **AP condicionada à representação** (salvo PJ pública).

### Estelionato eletrônico (CP 171 §2º-A)
Acrescentado pela Lei 14.155/21.

## Marco Civil (12.965/14)

### Princípios
Liberdade expressão, privacidade, proteção dados, neutralidade.

### Direitos usuário (art. 7º)
Inviolabilidade intimidade, sigilo, não-suspensão, consentimento expresso.

### Neutralidade (art. 9º)
Pacotes tratados isonomicamente.

### Guarda
- Conexão: **1 ano**.
- Aplicações: **6 meses**.

### Responsabilidade
- Conexão: NÃO responde.
- Aplicações: após ordem judicial.
- Cunho sexual privado: notificação basta (art. 21).

## LGPD (13.709/18)

### Conceitos
- Dado pessoal vs **sensível** (raça, religião, política, sindicato, saúde, sexual, genético/biométrico).
- Controlador (decide) vs Operador (executa) vs DPO/Encarregado.

### Bases legais
Consentimento, obrigação legal, contrato, vida, saúde, legítimo interesse.

### Direitos titular
Acesso, correção, anonimização, eliminação, portabilidade.

### Sanções
Até 2% faturamento OU R$ 50 milhões. Multa diária. ANPD aplica.

## Convenção Budapeste (Dec 11.491/23)

Acesso ilícito, interceptação, fraude informática, pornografia infantil online, cooperação internacional.

## Top pegadinhas Cebraspe

1. CP 154-A = AP CONDICIONADA À REPRESENTAÇÃO.
2. Guarda conexão = 1 ANO (não 6 meses).
3. Guarda aplicações = 6 MESES.
4. LGPD: dado sensível inclui raça/saúde/biométrico.
5. Multa LGPD = 2% OU R$ 50 mi.
6. Provedor conexão NÃO responde por conteúdo.
$resumo$
);

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" IN (
    SELECT id FROM "subjects" WHERE slug IN (
      'legislacao-especial', 'medicina-legal', 'direito-penal'
    )
  );
  RAISE NOTICE 'Onda 11 OK — total de materiais nesses subjects: %', v_count;
END $$;
