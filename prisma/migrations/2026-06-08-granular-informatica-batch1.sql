-- =====================================================================
-- BATCH 1 — Informática Granular
-- =====================================================================
-- 8 materiais (1500-2000 palavras cada), 1 por tópico específico.
-- Idempotente: pode rodar várias vezes; preserva status REVIEWED/PUBLISHED.
-- =====================================================================

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
  ON CONFLICT ("materialId") DO UPDATE SET resumo = p_resumo, "generatedAt" = NOW();
END;
$func$ LANGUAGE plpgsql;

-- =====================================================================
-- 1/8 — Sistemas Operacionais (Windows 10/11 e Linux)
-- =====================================================================
SELECT upsert_material(
  'informatica',
  'Sistemas Operacionais (Windows 10/11 e Linux)',
  'Sistemas Operacionais: Windows e Linux para Concursos Policiais',
  E'# Sistemas Operacionais: Windows e Linux para Concursos Policiais

## 1. Introdução

O estudo de Sistemas Operacionais (SO) é um dos pilares da disciplina de Informática nos concursos da area policial (PF, PRF, PCDF, PCSP). As bancas CEBRASPE, FGV e VUNESP cobram tanto conceitos teóricos (definição de SO, gerenciamento de processos e memória) quanto conhecimentos práticos sobre o Windows 10/11 e distribuições Linux. O candidato precisa dominar atalhos de teclado, funcionalidades nativas e as diferenças estruturais entre os dois sistemas.

Para o policial em exercício, o domínio do SO é operacional: a perícia criminal utiliza ferramentas baseadas em Linux para análise forense digital, enquanto as delegacias e sistemas administrativos rodam predominantemente em Windows. Conhecer ambos é requisito do edital e da prática profissional.

---

## 2. Conceitos Fundamentais

### 2.1. O que é um Sistema Operacional?
O Sistema Operacional é o software básico que gerencia os recursos de hardware (processador, memória RAM, disco, dispositivos de E/S) e fornece uma interface para que os programas aplicativos e o usuario possam interagir com a maquina. Ele atua como intermediário entre o hardware e o usuario.

**Funções principais de um SO:**
* **Gerenciamento de Processos**: Controla a execução de programas, alternando entre tarefas (multitarefa).
* **Gerenciamento de Memória**: Aloca e desaloca espaço na memória RAM para os processos em execução, utilizando técnicas como paginação e memória virtual.
* **Gerenciamento de Arquivos**: Organiza dados em diretórios e arquivos no disco, utilizando sistemas de arquivos (NTFS, ext4, FAT32).
* **Gerenciamento de Dispositivos (E/S)**: Controla a comunicação entre o computador e os periféricos (impressora, mouse, teclado) por meio de drivers.
* **Segurança e Controle de Acesso**: Gerencia contas de usuario, permissões e autenticação.

### 2.2. Tipos de Sistemas Operacionais
* **Monousuário / Multiusuário**: Permite que um ou vários usuarios utilizem o sistema simultaneamente.
* **Monotarefa / Multitarefa**: Executa uma ou várias tarefas ao mesmo tempo.
* **Proprietário / Livre (Open Source)**: Windows é proprietário (licença paga); Linux é livre (código aberto sob licença GPL).

---

## 3. Windows 10 e Windows 11

### 3.1. Área de Trabalho e Elementos Visuais
* **Barra de Tarefas**: Localizada na parte inferior da tela (no Windows 11, os ícones são centralizados por padrão). Contém o botão Iniciar, a barra de pesquisa (Cortana/Search), ícones fixados e a bandeja do sistema (relógio, rede, som, notificações).
* **Menu Iniciar**: No Windows 10, combina blocos dinâmicos (Live Tiles) com lista de aplicativos. No Windows 11, o Menu Iniciar é centralizado, sem blocos dinâmicos, com seção de “Fixados” e “Recomendados”.
* **Explorador de Arquivos**: Gerenciador de pastas e arquivos. No Windows 11, a barra de menus foi simplificada para uma interface com ícones (copiar, colar, renomear) em vez de abas.

### 3.2. Atalhos de Teclado (Mais Cobrados)

| Atalho | Função |
|---|---|
| **Win + E** | Abre o Explorador de Arquivos |
| **Win + D** | Mostra/oculta a Área de Trabalho |
| **Win + L** | Bloqueia o computador |
| **Win + I** | Abre as Configurações |
| **Win + R** | Abre a caixa “Executar” |
| **Win + Print Screen** | Captura a tela e salva em Imagens/Capturas |
| **Ctrl + Shift + Esc** | Abre o Gerenciador de Tarefas diretamente |
| **Alt + Tab** | Alterna entre janelas abertas |
| **Alt + F4** | Fecha a janela ativa |
| **Win + Tab** | Visão de Tarefas (Task View) |
| **F2** | Renomeia arquivo selecionado |
| **Shift + Delete** | Exclui permanentemente (sem passar pela Lixeira) |

### 3.3. Ferramentas Nativas Importantes
* **Gerenciador de Tarefas** (Ctrl + Shift + Esc): Permite encerrar processos travados, monitorar CPU/memória/disco e gerenciar aplicativos de inicialização.
* **Painel de Controle vs. Configurações**: O Painel de Controle é a ferramenta clássica (ainda presente). As Configurações (Win + I) são a interface moderna que substituiu progressivamente o Painel.
* **Windows Defender (Segurança do Windows)**: Antivírus nativo integrado. Inclui firewall, proteção contra ransomware e controle de aplicativos.
* **BitLocker**: Ferramenta de criptografia de disco disponível nas edições Pro e Enterprise do Windows. Protege os dados do disco contra acesso não autorizado.
* **Prompt de Comando (cmd) e PowerShell**: Interfaces de linha de comando. O PowerShell é mais avançado e suporta scripts complexos.

### 3.4. Sistema de Arquivos NTFS
O NTFS (New Technology File System) é o sistema de arquivos padrão do Windows. Suas características:
* Suporta arquivos maiores que 4 GB (diferença crucial em relação ao FAT32).
* Permite configuração de permissões de acesso por arquivo/pasta.
* Suporta compactação e criptografia nativas (EFS).
* Possui journaling (registro de alterações para recuperação após falhas).

---

## 4. Linux: Conceitos para Concursos

### 4.1. Características Gerais
* **Software Livre**: Código-fonte aberto, sob licença GPL (General Public License). Qualquer pessoa pode usar, modificar e redistribuir.
* **Multiusuário e Multitarefa**: Desde sua concepção.
* **Distribuições (Distros)**: O Linux é um kernel; o SO completo é uma distribuição. As mais cobradas em provas: **Ubuntu**, **Debian**, **CentOS**, **Fedora**, **Kali Linux** (usada em perícia e pentest).
* **Case-Sensitive**: O Linux diferencia maiúsculas de minúsculas nos nomes de arquivos. “Relatorio.pdf” e “relatorio.pdf” são arquivos diferentes.

### 4.2. Estrutura de Diretórios (FHS)
No Linux, não há “C:”, “D:”. Tudo parte da raiz “/”.

| Diretório | Função |
|---|---|
| **/** | Raiz do sistema de arquivos |
| **/home** | Diretórios pessoais dos usuarios |
| **/root** | Diretório do superusuário (root) |
| **/etc** | Arquivos de configuração do sistema |
| **/bin** | Binários essenciais do sistema (comandos basicos) |
| **/var** | Dados variáveis (logs, filas de impressão) |
| **/tmp** | Arquivos temporários |
| **/usr** | Programas instalados pelo usuario |
| **/dev** | Dispositivos de hardware |
| **/boot** | Arquivos de inicialização do sistema |

### 4.3. Comandos Essenciais do Terminal

| Comando | Função |
|---|---|
| **ls** | Lista arquivos e diretórios |
| **cd** | Navega entre diretórios |
| **pwd** | Mostra o diretório atual |
| **cp** | Copia arquivos |
| **mv** | Move ou renomeia arquivos |
| **rm** | Remove arquivos (rm -r para diretórios) |
| **mkdir** | Cria diretórios |
| **chmod** | Altera permissões de arquivos |
| **chown** | Altera o dono de um arquivo |
| **sudo** | Executa comando como superusuário |
| **apt-get / yum** | Instala pacotes (Debian/Ubuntu vs. CentOS/Fedora) |
| **grep** | Busca padrões em arquivos de texto |
| **cat** | Exibe o conteúdo de um arquivo |
| **man** | Exibe o manual de um comando |

### 4.4. Permissões de Arquivos (rwx)
O sistema de permissões do Linux é baseado em três grupos: **Dono (u)**, **Grupo (g)** e **Outros (o)**, com três tipos de permissão cada: **Leitura (r=4)**, **Escrita (w=2)** e **Execução (x=1)**.
* *Exemplo*: `chmod 755 script.sh` significa:
  * Dono: rwx (4+2+1=7)
  * Grupo: r-x (4+0+1=5)
  * Outros: r-x (4+0+1=5)

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PF — Agente)
**Enunciado**: No sistema operacional Windows 10, o atalho de teclado Win + L permite que o usuario encerre a sessão atual, fazendo logoff do sistema.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: O atalho Win + L **bloqueia** a tela do computador, mantendo a sessão do usuario ativa. Para fazer logoff (encerrar sessão), o procedimento é diferente: clica-se no Menu Iniciar, no ícone do usuario, e seleciona “Sair”. O candidato que confunde “bloquear” com “encerrar sessão” cai na pegadinha.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: No sistema operacional Linux, o comando utilizado para alterar as permissões de acesso a um arquivo é:
a) chown
b) chmod
c) chgrp
d) passwd
e) ls -la

* **Gabarito: B**
* **Comentário**: O comando **chmod** (change mode) é o responsável por alterar permissões de leitura, escrita e execução. O **chown** altera o proprietário do arquivo. O **chgrp** altera o grupo. O **passwd** altera senhas. O **ls -la** lista arquivos com suas permissões, mas não as altera.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: No Windows 11, para excluir um arquivo de forma permanente, sem enviá-lo para a Lixeira, o usuario deve selecionar o arquivo e pressionar:
a) Delete
b) Ctrl + Delete
c) Alt + Delete
d) Shift + Delete
e) Win + Delete

* **Gabarito: D**
* **Comentário**: O atalho **Shift + Delete** exclui o arquivo permanentemente, sem passar pela Lixeira. O **Delete** simples envia para a Lixeira. As demais combinações não possuem essa função.

---

## 6. Pegadinhas Mais Frequentes

1. **FAT32 vs. NTFS**: O FAT32 tem limite de 4 GB por arquivo. O NTFS não tem esse limite prático. As bancas adoram perguntar “qual sistema de arquivos suporta arquivos maiores que 4 GB?”.
2. **Linux é case-sensitive, Windows não**: No Windows, “Arquivo.txt” e “arquivo.txt” são o mesmo arquivo. No Linux, são dois arquivos distintos.
3. **BitLocker vs. EFS**: BitLocker criptografa o disco inteiro (ou partição). EFS criptografa arquivos/pastas individualmente. Ambos exigem edição Pro ou Enterprise do Windows.
4. **Superusuário Linux**: O usuario “root” tem permissão total sobre o sistema. O comando “sudo” permite que um usuario comum execute comandos com privilégio de root temporariamente.

---

## 7. Quadro-Resumo Comparativo

| Característica | Windows 10/11 | Linux |
|---|---|---|
| **Licença** | Proprietária (paga) | Livre (GPL) |
| **Sistema de Arquivos** | NTFS (padrão), FAT32, exFAT | ext4 (padrão), ext3, XFS |
| **Case-Sensitive** | Não | Sim |
| **Interface** | GUI nativa (obrigatória) | GUI opcional (pode ser só terminal) |
| **Gerenciador de Pacotes** | Microsoft Store / .exe / .msi | apt, yum, dnf, pacman |
| **Antivírus Nativo** | Windows Defender | Não possui (mas ClamAV é comum) |
| **Criptografia de Disco** | BitLocker | LUKS |
| **Uso em Perícia** | Pouco usado | Kali Linux (padrão em forense) |

---

## 8. Conclusão

O domínio dos Sistemas Operacionais Windows e Linux vai muito além de saber clicar em ícones. As bancas de concursos policiais exigem conhecimento técnico sobre gerenciamento de arquivos, permissões, atalhos e diferenças estruturais entre os dois sistemas. O candidato que domina a teoria e pratica os atalhos no dia a dia garante pontos rápidos nesta disciplina.',
  'Estudo comparativo dos sistemas operacionais Windows 10/11 e Linux para concursos policiais. Aborda conceitos fundamentais de SO (gerenciamento de processos, memória, arquivos e dispositivos), a interface do Windows (Explorador, Menu Iniciar, Barra de Tarefas), atalhos de teclado essenciais, ferramentas nativas (Gerenciador de Tarefas, BitLocker, Windows Defender), sistema NTFS. No Linux, cobre distribuições, estrutura FHS de diretórios, comandos de terminal e o sistema de permissões rwx. Inclui questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 2/8 — Edição de Textos, Planilhas e Apresentações
-- =====================================================================
SELECT upsert_material(
  'informatica',
  'Edição de Textos, Planilhas e Apresentações (Microsoft Office e LibreOffice)',
  'Microsoft Office e LibreOffice: Word, Excel, Calc e Impress para Concursos',
  E'# Microsoft Office e LibreOffice: Editores de Texto, Planilhas e Apresentações

## 1. Introdução

Os aplicativos de escritório (suítes de produtividade) são o tema mais cobrado em Informática nos concursos policiais. As bancas CEBRASPE, FGV e VUNESP exploram funcionalidades específicas do **Microsoft Word**, **Excel** e **PowerPoint**, bem como seus equivalentes no **LibreOffice** (Writer, Calc e Impress). O candidato precisa conhecer desde atalhos básicos de formatação até funções avançadas de planilha eletrônica, pois as questões são cada vez mais detalhistas.

No ambiente policial, esses aplicativos são utilizados diariamente: relatórios de investigação são redigidos no Word/Writer, dados estatísticos de criminalidade são organizados no Excel/Calc, e apresentações operacionais são montadas no PowerPoint/Impress.

---

## 2. Microsoft Word / LibreOffice Writer

### 2.1. Atalhos de Teclado Essenciais

| Atalho | Função |
|---|---|
| **Ctrl + N** | Novo documento |
| **Ctrl + O** | Abrir documento |
| **Ctrl + S** | Salvar |
| **Ctrl + P** | Imprimir |
| **Ctrl + Z** | Desfazer |
| **Ctrl + Y** | Refazer |
| **Ctrl + B** | Negrito |
| **Ctrl + I** | Itálico |
| **Ctrl + U** | Sublinhado |
| **Ctrl + E** | Centralizar parágrafo |
| **Ctrl + L** | Alinhar à esquerda |
| **Ctrl + R** | Alinhar à direita |
| **Ctrl + J** | Justificar |
| **Ctrl + A** | Selecionar tudo |
| **Ctrl + H** | Localizar e Substituir |
| **Ctrl + K** | Inserir hiperlink |
| **F7** | Verificação ortográfica |

### 2.2. Funcionalidades Cobradas em Prova
* **Mala Direta (Mail Merge)**: Recurso que permite criar documentos personalizados em massa (cartas, etiquetas, envelopes) a partir de uma fonte de dados (planilha ou banco de dados). Guias: Correspondências > Iniciar Mala Direta.
* **Estilos e Formatação**: Estilos predefinidos (Título 1, Título 2, Normal) garantem formatação consistente e permitem gerar sumários automaticamente.
* **Sumário Automático**: Insere um índice baseado nos estilos de título aplicados. Referências > Sumário.
* **Cabeçalho e Rodapé**: Textos fixos no topo e na base de todas as páginas. Podem incluir numeração de páginas, data e logotipos.
* **Quebras de Página e Seção**: Quebra de página força o texto para a próxima página. Quebra de seção permite configurações diferentes de layout em partes distintas do documento (ex: orientação retrato e paisagem no mesmo documento).
* **Controle de Alterações (Revisão)**: Permite que múltiplos revisores façam alterações rastreáveis no documento. Revisar > Controlar Alterações.

### 2.3. Extensões de Arquivo

| Aplicativo | Formato Padrão | Formato Antigo | Formato PDF |
|---|---|---|---|
| Word | .docx | .doc | Exportar como PDF |
| Writer | .odt | .odt | Exportar como PDF |

---

## 3. Microsoft Excel / LibreOffice Calc

### 3.1. Conceitos Básicos
* **Célula**: Interseção de uma coluna (letra) com uma linha (número). Ex: A1, B3, Z100.
* **Planilha**: Conjunto de células. Um arquivo (pasta de trabalho) pode conter múltiplas planilhas (abas).
* **Referência Relativa**: A1 — muda ao copiar a fórmula para outra célula.
* **Referência Absoluta**: $A$1 — permanece fixa ao copiar (o cifrão “$” trava a referência).
* **Referência Mista**: $A1 ou A$1 — trava apenas a coluna ou a linha.

### 3.2. Funções Mais Cobradas

| Função | Sintaxe | O que faz |
|---|---|---|
| **SOMA** | =SOMA(A1:A10) | Soma valores de um intervalo |
| **MÉDIA** | =MÉDIA(A1:A10) | Calcula a média aritmética |
| **MÁXIMO** | =MÁXIMO(A1:A10) | Retorna o maior valor |
| **MÍNIMO** | =MÍNIMO(A1:A10) | Retorna o menor valor |
| **CONT.SE** | =CONT.SE(A1:A10;“>5”) | Conta células que atendem a um critério |
| **SOMASE** | =SOMASE(A:A;“PF”;B:B) | Soma valores com base em uma condição |
| **SE** | =SE(A1>10;“Aprovado”;“Reprovado”) | Retorna valor conforme condição lógica |
| **PROCV** | =PROCV(A1;Tab!A:C;3;0) | Busca vertical em uma tabela |
| **CONCATENAR** | =CONCATENAR(A1;“ ”;B1) | Junta textos de células diferentes |

* **Atenção ao separador**: No Excel em português, o separador de argumentos é **ponto e vírgula (;)**, não vírgula.
* **No LibreOffice Calc**: As funções têm nomes em português similares, mas podem variar levemente.

### 3.3. Formatação Condicional e Gráficos
* **Formatação Condicional**: Aplica cores ou ícones automaticamente com base em regras (ex: valores negativos em vermelho).
* **Gráficos**: Tipos mais cobrados: colunas, barras, pizza (setores), linhas. Inserir > Gráfico.
* **Filtro e Classificação**: Dados > Filtro permite exibir apenas linhas que atendam a critérios. Classificar ordena os dados por coluna.

---

## 4. Microsoft PowerPoint / LibreOffice Impress

### 4.1. Conceitos Básicos
* **Slide**: Cada “página” da apresentação.
* **Layout**: Modelo de distribuição de conteúdo no slide (título, conteúdo, em branco, etc.).
* **Transição**: Efeito visual que ocorre na mudança entre slides.
* **Animação**: Efeito visual aplicado a elementos individuais dentro de um slide (textos, imagens).
* **Slide Mestre**: Template global que define o visual padrão de todos os slides (cores, fontes, logotipo). Alterações no Slide Mestre afetam todos os slides.

### 4.2. Funcionalidades Cobradas em Prova
* **Modo Apresentação**: F5 inicia a apresentação do início. Shift + F5 inicia a partir do slide atual.
* **Anotações do Apresentador**: Notas visíveis apenas para quem está apresentando (não aparecem na projeção).
* **Inserir Hiperlink**: Ctrl + K. Permite navegar para sites, outros slides ou documentos.

### 4.3. Extensões de Arquivo

| Aplicativo | Formato Padrão | Formato Antigo |
|---|---|---|
| PowerPoint | .pptx | .ppt |
| Impress | .odp | .odp |

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PRF — Policial)
**Enunciado**: No Microsoft Excel, a fórmula =SOMA(A1:A5) calcula a soma dos valores contidos nas células A1, A2, A3, A4 e A5. Se o usuario desejar calcular a soma apenas das células A1, A3 e A5, deverá utilizar a fórmula =SOMA(A1;A3;A5).
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário**: O operador “:” (dois-pontos) indica um intervalo contínuo (de A1 até A5). O operador “;” (ponto e vírgula) indica células individuais separadas. Portanto, =SOMA(A1;A3;A5) soma apenas essas três células.

### Questão 2 (FGV — PCRJ — Escrivão)
**Enunciado**: No Microsoft Word, o recurso que permite criar documentos personalizados em série, utilizando uma lista de destinatários como fonte de dados, é denominado:
a) Controle de Alterações
b) Sumário Automático
c) Mala Direta
d) Referência Cruzada
e) Macro

* **Gabarito: C**
* **Comentário**: A Mala Direta (Mail Merge) é o recurso que combina um documento modelo com uma fonte de dados para gerar documentos personalizados em massa.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: No Microsoft Excel 2016, a função que permite buscar um valor na primeira coluna de uma tabela e retornar o valor correspondente em outra coluna da mesma linha é:
a) PROCH
b) PROCV
c) ÍNDICE
d) CORRESP
e) DESLOC

* **Gabarito: B**
* **Comentário**: O PROCV (VLOOKUP) faz busca vertical: procura o valor na primeira coluna da tabela e retorna o valor da coluna indicada no terceiro argumento. O PROCH faz busca horizontal (nas linhas).

---

## 6. Pegadinhas Mais Frequentes

1. **Referência Absoluta ($)**: A banca mostra uma fórmula com $ e pede o resultado ao copiar para outra célula. Lembre-se: $ trava a referência.
2. **PROCV com valor inexato (1) vs. exato (0)**: O quarto argumento do PROCV determina se a busca é aproximada (1/VERDADEIRO) ou exata (0/FALSO). Em provas, quase sempre se exige busca exata.
3. **Diferença entre Transição e Animação no PowerPoint**: Transição é entre slides. Animação é dentro de um slide. As bancas misturam os termos para confundir.
4. **Extensões .docx vs .doc**: O formato .docx (Office 2007+) é baseado em XML e ocupa menos espaço. O .doc é o formato binário antigo.

---

## 7. Quadro-Resumo

| Suíte | Editor de Texto | Planilha | Apresentação | Formato Nativo |
|---|---|---|---|---|
| **Microsoft Office** | Word (.docx) | Excel (.xlsx) | PowerPoint (.pptx) | OOXML |
| **LibreOffice** | Writer (.odt) | Calc (.ods) | Impress (.odp) | ODF |

---

## 8. Conclusão

O domínio dos aplicativos de escritório é garantia de pontos nas provas de Informática. As questões são objetivas e diretas, exigindo conhecimento prático de atalhos, funções de planilha e funcionalidades específicas. O candidato que pratica no dia a dia e memoriza as funções mais cobradas (SOMA, SE, PROCV, CONT.SE) sai na frente.',
  'Estudo das suítes de produtividade Microsoft Office e LibreOffice para concursos policiais. Aborda Word/Writer (atalhos de formatação, Mala Direta, Sumário Automático, Controle de Alterações), Excel/Calc (referências relativas e absolutas, funções SOMA, MÉDIA, SE, PROCV, CONT.SE, SOMASE, formatação condicional e gráficos) e PowerPoint/Impress (slides, transições, animações, Slide Mestre). Inclui tabelas de atalhos, extensões de arquivo e questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 3/8 — Conceitos de Internet, Intranet e Extranet
-- =====================================================================
SELECT upsert_material(
  'informatica',
  'Conceitos de Internet, Intranet e Extranet',
  'Internet, Intranet e Extranet: Conceitos e Protocolos para Concursos',
  E'# Internet, Intranet e Extranet: Conceitos e Protocolos

## 1. Introdução

A compreensão dos conceitos de redes de computadores, especialmente Internet, Intranet e Extranet, é fundamental para os concursos policiais. As bancas CEBRASPE, FGV e VUNESP cobram desde definições básicas até os protocolos de comunicação que sustentam a World Wide Web. No contexto das carreiras policiais, a Internet é ferramenta de investigação (OSINT — Open Source Intelligence), a Intranet é o sistema de comunicação interno das corporações, e a Extranet permite a cooperação entre órgãos de segurança pública.

---

## 2. Internet

### 2.1. Definição e Características
A Internet é uma rede mundial de computadores interconectados que utiliza o conjunto de protocolos **TCP/IP** para trocar dados. É uma rede pública, descentralizada e de alcance global.

### 2.2. Protocolos Fundamentais

| Protocolo | Porta | Função |
|---|---|---|
| **HTTP** | 80 | Transferência de páginas web (não criptografado) |
| **HTTPS** | 443 | HTTP com criptografia SSL/TLS (seguro) |
| **FTP** | 20/21 | Transferência de arquivos |
| **SMTP** | 25/587 | Envio de e-mails |
| **POP3** | 110 | Recebimento de e-mails (baixa e remove do servidor) |
| **IMAP** | 143 | Recebimento de e-mails (mantém cópia no servidor) |
| **DNS** | 53 | Traduz nomes de domínio em endereços IP |
| **DHCP** | 67/68 | Atribui endereços IP automaticamente |
| **TCP** | — | Protocolo de transporte confiável (com confirmação) |
| **UDP** | — | Protocolo de transporte rápido (sem confirmação) |
| **IP** | — | Protocolo de endereçamento e roteamento |
| **SSH** | 22 | Acesso remoto seguro (criptografado) |
| **Telnet** | 23 | Acesso remoto NÃO seguro (obsoleto) |

### 2.3. Modelo TCP/IP (4 Camadas)

| Camada | Protocolos | Função |
|---|---|---|
| **Aplicação** | HTTP, HTTPS, FTP, SMTP, DNS | Interface com o usuario |
| **Transporte** | TCP, UDP | Controle de fluxo e entrega |
| **Internet (Rede)** | IP, ICMP, ARP | Endereçamento e roteamento |
| **Acesso à Rede (Enlace)** | Ethernet, Wi-Fi | Conexão física |

### 2.4. URL (Uniform Resource Locator)
Estrutura: `protocolo://domínio:porta/caminho/recurso`
* *Exemplo*: `https://www.pf.gov.br:443/servicos/passaporte`
  * Protocolo: HTTPS
  * Domínio: www.pf.gov.br
  * Porta: 443 (padrão HTTPS, omitida normalmente)
  * Caminho: /servicos/passaporte

---

## 3. Intranet

### 3.1. Definição e Características
A Intranet é uma rede privada que utiliza os mesmos protocolos da Internet (TCP/IP), mas com acesso restrito aos membros de uma organização. É utilizada para comunicação interna, compartilhamento de documentos e sistemas corporativos.

**Diferenças da Internet:**
* Acesso restrito (requer autenticação).
* Geralmente protegida por firewall.
* Conteúdo interno (portarias, escalas de serviço, manuais, sistemas de RH).
* Pode ou não estar conectada à Internet.

*Exemplo policial:* A Intranet da Polícia Federal permite que delegados, agentes e escrivães acessem o sistema de inquéritos, comunicações internas e normativas institucionais de forma segura e centralizada.

---

## 4. Extranet

### 4.1. Definição e Características
A Extranet é uma extensão da Intranet que permite acesso controlado a usuarios externos autorizados (parceiros, fornecedores, outros órgãos). Utiliza os mesmos protocolos (TCP/IP) e tecnologias da Internet, mas com autenticação e criptografia.

**Diferenças da Intranet:**
* Permite acesso externo controlado (a Intranet é apenas interna).
* Utiliza VPN (Virtual Private Network) ou autenticação por token para garantir segurança.

*Exemplo policial:* A cooperação entre a Polícia Federal e a Interpol pode ocorrer via Extranet, permitindo que investigadores de diferentes países acessem bases de dados compartilhadas sobre procurados internacionais.

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PF — Escrivão)
**Enunciado**: A Intranet de uma organização utiliza protocolos de comunicação diferentes dos utilizados pela Internet, como o protocolo NetBEUI, já que sua finalidade é exclusivamente a comunicação local.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: A Intranet utiliza os **mesmos protocolos** da Internet, ou seja, o conjunto TCP/IP. O que a diferencia não é a tecnologia, mas o **escopo de acesso** (restrito aos membros da organização). O protocolo NetBEUI é obsoleto e não define uma Intranet.

### Questão 2 (FGV — Senado Federal — Policial Legislativo)
**Enunciado**: O protocolo responsável por traduzir nomes de domínio (como www.policiafederal.gov.br) em endereços IP numéricos é o:
a) DHCP
b) FTP
c) DNS
d) SMTP
e) ARP

* **Gabarito: C**
* **Comentário**: O DNS (Domain Name System) é o protocolo que traduz nomes de domínio legíveis para humanos em endereços IP numéricos que os computadores utilizam para se comunicar.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: A diferença fundamental entre Intranet e Extranet é que:
a) A Intranet não utiliza protocolo TCP/IP, enquanto a Extranet utiliza.
b) A Extranet permite acesso controlado a usuarios externos, enquanto a Intranet restringe o acesso apenas a membros internos.
c) A Intranet é uma rede pública e a Extranet é uma rede privada.
d) A Extranet funciona sem conexão com a Internet.
e) A Intranet não pode ter firewall, ao contrário da Extranet.

* **Gabarito: B**
* **Comentário**: A diferença fundamental é o escopo de acesso. A Intranet é restrita a membros internos; a Extranet estende esse acesso de forma controlada a usuarios externos autorizados.

---

## 6. Pegadinhas Mais Frequentes

1. **Intranet usa TCP/IP**: Muitas questões afirmam que a Intranet usa protocolos diferentes da Internet. ERRADO. Ambas usam TCP/IP.
2. **HTTPS vs. HTTP**: O HTTPS adiciona criptografia via SSL/TLS. A banca pergunta se “HTTPS garante que o site é confiável” — ERRADO. Ele garante que a **comunicação** é criptografada, não que o site em si é legítimo.
3. **POP3 vs. IMAP**: POP3 baixa e remove do servidor (padrão). IMAP mantém cópia no servidor e sincroniza entre dispositivos.
4. **TCP vs. UDP**: TCP é confiável (com confirmação de entrega). UDP é rápido mas sem garantia (usado em streaming e jogos online).

---

## 7. Quadro-Resumo

| Rede | Acesso | Protocolos | Exemplo Policial |
|---|---|---|---|
| **Internet** | Público e global | TCP/IP | Pesquisa OSINT em redes sociais |
| **Intranet** | Restrito (interno) | TCP/IP | Sistema de inquéritos da PF |
| **Extranet** | Externo controlado | TCP/IP + VPN | Cooperação PF-Interpol |

---

## 8. Conclusão

A compreensão das diferenças entre Internet, Intranet e Extranet, aliada ao conhecimento dos protocolos de comunicação, é essencial para as provas de Informática. O ponto-chave é lembrar que as três utilizam os mesmos protocolos TCP/IP; o que muda é o escopo de acesso e as políticas de segurança aplicadas.',
  'Estudo dos conceitos de Internet, Intranet e Extranet para concursos policiais. Aborda a definição e diferenças entre as três redes, os protocolos fundamentais do modelo TCP/IP (HTTP, HTTPS, FTP, SMTP, POP3, IMAP, DNS, DHCP, TCP, UDP, SSH), a estrutura de URLs e as aplicações práticas no contexto policial. Inclui tabelas comparativas, pegadinhas de prova e questões resolvidas do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 4/8 — Navegadores e Mecanismos de Busca
-- =====================================================================
SELECT upsert_material(
  'informatica',
  'Navegadores e Mecanismos de Busca',
  'Navegadores Web e Mecanismos de Busca: Recursos e Atalhos para Concursos',
  E'# Navegadores Web e Mecanismos de Busca

## 1. Introdução

Os navegadores de Internet (browsers) e os mecanismos de busca são ferramentas indispensáveis tanto para o candidato em prova quanto para o policial em atividade investigativa. As bancas CEBRASPE, FGV e VUNESP cobram funcionalidades específicas dos navegadores Google Chrome, Mozilla Firefox e Microsoft Edge, além de operadores de busca avançada do Google. No trabalho policial, técnicas de busca avançada são utilizadas em investigações de OSINT (Open Source Intelligence) para localizar informações sobre suspeitos em fontes abertas.

---

## 2. Navegadores Web

### 2.1. Principais Navegadores e Seus Motores de Renderização
* **Google Chrome**: Motor Blink (derivado do WebKit). Navegador mais utilizado no mundo.
* **Mozilla Firefox**: Motor Gecko. Navegador de código aberto, focado em privacidade.
* **Microsoft Edge**: Motor Blink (mesmo do Chrome, desde 2020). Substituto do Internet Explorer.
* **Safari**: Motor WebKit. Exclusivo de dispositivos Apple (macOS/iOS).

### 2.2. Atalhos de Teclado Universais (Chrome, Firefox, Edge)

| Atalho | Função |
|---|---|
| **Ctrl + T** | Abre nova aba |
| **Ctrl + W** | Fecha a aba atual |
| **Ctrl + Shift + T** | Reabre a última aba fechada |
| **Ctrl + Tab** | Alterna para a próxima aba |
| **Ctrl + L** ou **F6** | Seleciona a barra de endereço |
| **Ctrl + D** | Adiciona a página aos favoritos |
| **Ctrl + H** | Abre o histórico de navegação |
| **Ctrl + J** | Abre a página de downloads |
| **Ctrl + Shift + Delete** | Abre a tela para limpar dados de navegação |
| **Ctrl + F** | Abre a barra de pesquisa na página |
| **Ctrl + + / Ctrl + -** | Aumenta/diminui o zoom |
| **Ctrl + 0** | Restaura o zoom para 100% |
| **F5** ou **Ctrl + R** | Atualiza a página |
| **Ctrl + F5** ou **Ctrl + Shift + R** | Atualiza ignorando o cache |
| **F11** | Tela cheia |
| **Ctrl + Shift + N** (Chrome) | Abre janela anônima (InPrivate no Edge: Ctrl + Shift + P) |
| **Ctrl + Shift + P** (Firefox) | Abre janela privativa |

### 2.3. Navegação Privativa (Modo Anônimo)
No modo anônimo/privativo, o navegador:
* **NÃO salva** histórico de navegação, cookies ou dados de formulário após fechar a janela.
* **NÃO oculta** a atividade do provedor de Internet, do empregador ou do administrador de rede.
* **NÃO impede** que sites coletam informações durante a navegação.
* **NÃO é anonimato real**: O IP do usuario continua visível para os sites acessados.

### 2.4. Cookies e Cache
* **Cookies**: Pequenos arquivos de texto armazenados pelo navegador a pedido dos sites. Servem para manter sessões (login), preferências e rastreamento.
* **Cache**: Armazenamento local de páginas, imagens e scripts já acessados. Acelera o carregamento de sites revisitados. Ctrl + F5 força a atualização ignorando o cache.

### 2.5. Extensões e Complementos
* Ferramentas adicionais instaladas no navegador para ampliar funcionalidades (bloqueadores de anúncios, gerenciadores de senhas, ferramentas de captura de tela).
* **Atenção em provas**: Extensões podem representar riscos de segurança se forem de fontes não confiáveis.

---

## 3. Mecanismos de Busca (Google)

### 3.1. Operadores de Busca Avançada

| Operador | Função | Exemplo |
|---|---|---|
| **“...”** (aspas) | Busca a expressão exata | “polícia federal concurso 2025” |
| **-** (menos) | Exclui um termo da busca | concurso policial -bombeiro |
| **site:** | Busca apenas em um domínio | site:gov.br edital polícia |
| **filetype:** | Busca por tipo de arquivo | filetype:pdf edital PF 2025 |
| **intitle:** | Busca termo no título da página | intitle:“inquérito policial” |
| **inurl:** | Busca termo na URL | inurl:edital concurso |
| **OR** | Busca um termo OU outro | edital PF OR PRF |
| ***** (asterisco) | Curinga (substitui palavras) | “lei * de 2006” drogas |
| **..** (intervalo) | Busca em intervalo numérico | celular R$1000..R$2000 |
| **cache:** | Exibe a versão em cache do Google | cache:www.pf.gov.br |
| **related:** | Encontra sites semelhantes | related:www.pf.gov.br |

### 3.2. Dicas para OSINT Policial
* Combinar **site:** com **filetype:** para encontrar documentos específicos em sites governamentais.
* Usar aspas para buscar nomes completos de suspeitos.
* Usar **-** para filtrar resultados irrelevantes.
* O operador **cache:** pode revelar conteúdo que já foi removido de um site.

---

## 4. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PF — Agente)
**Enunciado**: No Google Chrome, ao utilizar o modo de navegação anônima (Ctrl + Shift + N), o usuario garante total anonimato na Internet, impedindo que provedores de Internet ou administradores de rede monitorem suas atividades.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: O modo anônimo apenas impede que o navegador local salve histórico, cookies e dados de formulário. O provedor de Internet, o empregador e o administrador de rede continuam podendo monitorar a atividade. Para anonimato real, seria necessário usar ferramentas como Tor ou VPN.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: Para encontrar documentos em formato PDF disponíveis apenas no domínio do governo federal, o operador de busca adequado no Google seria:
a) “PDF” site:gov.br
b) filetype:pdf site:gov.br
c) type:pdf domain:gov.br
d) ext:pdf url:gov.br
e) formato:pdf em:gov.br

* **Gabarito: B**
* **Comentário**: A combinação correta de operadores do Google é **filetype:pdf** (busca por tipo de arquivo) + **site:gov.br** (restringe ao domínio).

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: No navegador Mozilla Firefox, o atalho de teclado que permite reabrir a última aba fechada é:
a) Ctrl + Z
b) Ctrl + T
c) Ctrl + Shift + T
d) Ctrl + Tab
e) Ctrl + H

* **Gabarito: C**
* **Comentário**: Ctrl + Shift + T reabre a última aba fechada em todos os navegadores modernos (Chrome, Firefox, Edge). Ctrl + T abre uma nova aba em branco. Ctrl + Z desfaz dentro de campos de texto, não abas.

---

## 5. Pegadinhas Mais Frequentes

1. **Modo Anônimo NÃO é anonimato**: Apenas não salva dados localmente.
2. **Cache vs. Cookie**: Cache armazena arquivos do site (imagens, scripts). Cookie armazena dados do usuario (login, preferências).
3. **Ctrl + Shift + N vs. Ctrl + Shift + P**: Chrome e Edge usam Ctrl + Shift + N para janela anônima/InPrivate. Firefox usa Ctrl + Shift + P para navegação privativa.
4. **Motor de renderização**: Chrome e Edge usam Blink. Firefox usa Gecko. Safari usa WebKit.

---

## 6. Quadro-Resumo

| Navegador | Motor | Janela Privativa | Desenvolvedor |
|---|---|---|---|
| **Chrome** | Blink | Ctrl + Shift + N | Google |
| **Firefox** | Gecko | Ctrl + Shift + P | Mozilla |
| **Edge** | Blink | Ctrl + Shift + N | Microsoft |
| **Safari** | WebKit | Cmd + Shift + N | Apple |

---

## 7. Conclusão

Navegadores e mecanismos de busca são ferramentas de trabalho para o policial e fontes constantes de questões em prova. O candidato que memoriza os atalhos de teclado universais, conhece as diferenças entre os modos de navegação e domina os operadores avançados do Google garante pontos rápidos e consistentes na disciplina de Informática.',
  'Estudo dos navegadores web (Chrome, Firefox, Edge, Safari) e mecanismos de busca para concursos policiais. Aborda motores de renderização, atalhos de teclado universais, navegação privativa (modo anônimo), cookies, cache, extensões. Detalha os operadores de busca avançada do Google (site:, filetype:, intitle:, aspas, menos) e sua aplicação em OSINT policial. Inclui questões resolvidas do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 5/8 — Correio eletrônico
-- =====================================================================
SELECT upsert_material(
  'informatica',
  'Correio eletrônico (Outlook, Thunderbird, webmail)',
  'Correio Eletrônico: Protocolos, Clientes e Segurança para Concursos',
  E'# Correio Eletrônico: Protocolos, Clientes e Segurança

## 1. Introdução

O correio eletrônico (e-mail) é um dos meios de comunicação mais utilizados no serviço público e nas forças de segurança. Para os concursos policiais, as bancas CEBRASPE, FGV e VUNESP cobram desde os protocolos que sustentam o funcionamento do e-mail (SMTP, POP3, IMAP) até as funcionalidades práticas dos clientes de e-mail (Microsoft Outlook, Mozilla Thunderbird) e dos serviços de webmail (Gmail, Outlook.com). O candidato precisa diferenciar claramente os campos de destinatário (Para, CC, CCO) e compreender os riscos de segurança associados a anexos e links maliciosos.

---

## 2. Protocolos de E-mail

### 2.1. SMTP (Simple Mail Transfer Protocol)
* **Função**: Protocolo de **envio** de e-mails.
* **Portas**: 25 (padrão sem criptografia), 587 (com autenticação TLS/STARTTLS), 465 (SSL).
* **Direção**: Do remetente para o servidor de e-mail do destinatário.

### 2.2. POP3 (Post Office Protocol v3)
* **Função**: Protocolo de **recebimento** de e-mails.
* **Porta**: 110 (sem criptografia), 995 (com SSL/TLS).
* **Comportamento padrão**: Baixa as mensagens do servidor para o dispositivo local e **remove** do servidor (pode ser configurado para manter cópia).
* **Ideal para**: Uso em um único dispositivo (as mensagens ficam armazenadas localmente).

### 2.3. IMAP (Internet Message Access Protocol)
* **Função**: Protocolo de **recebimento** de e-mails.
* **Porta**: 143 (sem criptografia), 993 (com SSL/TLS).
* **Comportamento padrão**: Mantém as mensagens **no servidor** e sincroniza com múltiplos dispositivos.
* **Ideal para**: Uso em vários dispositivos (celular, notebook, desktop) — as mensagens ficam acessíveis de qualquer lugar.

### 2.4. Tabela Comparativa POP3 vs. IMAP

| Característica | POP3 | IMAP |
|---|---|---|
| **Mensagens ficam** | No dispositivo local | No servidor |
| **Sincronização** | Não sincroniza | Sincroniza entre dispositivos |
| **Acesso offline** | Sim (após baixar) | Parcial (headers podem ser baixados) |
| **Uso de espaço no servidor** | Libera espaço (remove) | Consome espaço (mantém) |
| **Porta padrão** | 110 | 143 |
| **Porta segura** | 995 | 993 |

---

## 3. Campos de E-mail

| Campo | Nome | Função |
|---|---|---|
| **Para (To)** | Destinatário principal | Pessoa(s) a quem a mensagem é dirigida diretamente |
| **CC (Cópia Carbono)** | Com Cópia | Pessoas que receberão cópia da mensagem. Todos os destinatários conseguem ver quem está em CC |
| **CCO (Cópia Carbono Oculta)** | Cópia Oculta | Pessoas que receberão cópia da mensagem, mas cujos endereços ficam invisíveis para os demais destinatários |
| **Assunto (Subject)** | Titulo da mensagem | Resumo do conteúdo do e-mail |

**Regra de ouro para provas**: Os destinatários em CCO (BCC em inglês) não são visíveis para ninguém, nem para quem está em “Para” ou “CC”.

---

## 4. Clientes de E-mail

### 4.1. Microsoft Outlook
* Cliente de e-mail proprietário da Microsoft, parte do pacote Office.
* Funcionalidades cobradas: calendário integrado, regras de organização (mover mensagens automaticamente), categorias por cor, pesquisa avançada, assinatura digital e criptografia S/MIME.
* Suporta contas Exchange (corporativas), IMAP e POP3.
* **Formato de arquivo**: .pst (arquivo de dados pessoais) e .ost (cache offline).

### 4.2. Mozilla Thunderbird
* Cliente de e-mail gratuito e de código aberto da Mozilla Foundation.
* Suporta IMAP, POP3, SMTP.
* Extensível via complementos (add-ons).
* Funcionalidade de filtros (similar às regras do Outlook).
* **Formato de arquivo**: .mbox (padrão Unix de armazenamento).

### 4.3. Webmail
* E-mail acessado diretamente pelo navegador, sem necessidade de instalar software.
* Exemplos: Gmail (Google), Outlook.com (Microsoft), Yahoo Mail.
* Utiliza HTTPS para segurança da comunicação.
* **Vantagem**: Acessível de qualquer dispositivo com navegador.
* **Desvantagem**: Requer conexão com Internet para funcionar.

---

## 5. Segurança em E-mail

### 5.1. Ameaças Comuns
* **Phishing**: E-mails fraudulentos que imitam instituições legítimas para roubar dados (senhas, cartões de crédito). Frequentemente contêm links para páginas falsas.
* **Spam**: Mensagens não solicitadas enviadas em massa, geralmente publicitárias ou maliciosas.
* **Anexos Maliciosos**: Arquivos infectados com malware (vírus, trojan, ransomware). Extensões perigosas: .exe, .bat, .scr, .js, .vbs.
* **Spoofing**: Falsificação do endereço de e-mail do remetente para parecer que vem de uma fonte confiável.

### 5.2. Mecanismos de Proteção
* **Assinatura Digital**: Garante a autenticidade do remetente e a integridade da mensagem (utiliza certificado digital).
* **Criptografia S/MIME ou PGP**: Codifica o conteúdo do e-mail para que apenas o destinatário possa ler.
* **SPF, DKIM e DMARC**: Protocolos de autenticação de e-mail que ajudam a prevenir spoofing e phishing.
* **Filtros Anti-Spam**: Presentes em todos os clientes modernos e webmails.

---

## 6. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PCDF — Escrivão)
**Enunciado**: O protocolo IMAP, diferentemente do POP3, permite que o usuario acesse suas mensagens de e-mail de diferentes dispositivos, mantendo a sincronização entre eles, uma vez que as mensagens permanecem armazenadas no servidor.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário**: Esta é a diferença fundamental entre IMAP e POP3. O IMAP mantém as mensagens no servidor e sincroniza entre múltiplos dispositivos. O POP3, por padrão, baixa e remove do servidor, impossibilitando a sincronização.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: Em uma mensagem de e-mail, quando o remetente adiciona endereços no campo CCO (Cópia Carbono Oculta), os demais destinatários:
a) conseguem ver os endereços em CCO ao receber a mensagem.
b) não recebem a mensagem, pois CCO é apenas um registro interno.
c) recebem a mensagem, mas não conseguem ver os endereços em CCO.
d) podem ver os endereços em CCO se clicarem em “Mostrar detalhes”.
e) recebem a mensagem apenas se estiverem também no campo “Para”.

* **Gabarito: C**
* **Comentário**: Os destinatários em CCO recebem normalmente a mensagem, mas seus endereços ficam completamente ocultos para todos os outros (tanto os de “Para” quanto os de “CC”).

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: O protocolo utilizado para o envio de mensagens de correio eletrônico é o:
a) POP3
b) IMAP
c) FTP
d) SMTP
e) HTTP

* **Gabarito: D**
* **Comentário**: O SMTP (Simple Mail Transfer Protocol) é o protocolo responsável pelo **envio** de e-mails. POP3 e IMAP são protocolos de **recebimento**. FTP é para transferência de arquivos. HTTP é para páginas web.

---

## 7. Pegadinhas Mais Frequentes

1. **SMTP envia, POP3/IMAP recebem**: Nunca confunda as funções. SMTP é o “carteiro” que leva; POP3/IMAP são o “porteiro” que recebe.
2. **CCO oculta de TODOS**: Quem está em CCO não aparece para ninguém, nem para outros que estão em CCO.
3. **POP3 remove do servidor (padrão)**: Pode ser configurado para manter, mas o padrão é remover.
4. **Phishing vs. Spam**: Phishing é fraude (tenta roubar dados). Spam é propaganda indesejada (pode ser inofensivo).

---

## 8. Quadro-Resumo

| Protocolo | Função | Porta Padrão | Porta Segura |
|---|---|---|---|
| **SMTP** | Envio | 25 / 587 | 465 |
| **POP3** | Recebimento (local) | 110 | 995 |
| **IMAP** | Recebimento (servidor) | 143 | 993 |

---

## 9. Conclusão

O correio eletrônico é uma das áreas mais previsíveis da prova de Informática. As questões seguem padrões claros: diferenciação entre protocolos (SMTP vs. POP3 vs. IMAP), campos de destinatário (Para, CC, CCO) e riscos de segurança (phishing, anexos maliciosos). O candidato que memoriza a tabela de protocolos e suas portas garante acertos rápidos.',
  'Estudo do correio eletrônico para concursos policiais. Aborda os protocolos SMTP (envio), POP3 e IMAP (recebimento), com portas e diferenças de comportamento. Detalha campos de e-mail (Para, CC, CCO), clientes (Outlook, Thunderbird), webmail e segurança (phishing, spam, spoofing, assinatura digital, criptografia). Inclui tabelas comparativas POP3 vs. IMAP e questões resolvidas do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 6/8 — Segurança da Informação
-- =====================================================================
SELECT upsert_material(
  'informatica',
  'Segurança da Informação: ataques, malware, criptografia, certificação digital',
  'Segurança da Informação: Ataques, Malware e Criptografia para Concursos',
  E'# Segurança da Informação: Ataques, Malware e Criptografia

## 1. Introdução

A Segurança da Informação é o tema de maior peso e complexidade na disciplina de Informática dos concursos policiais. As bancas CEBRASPE, FGV e VUNESP dedicam múltiplas questões aos princípios de segurança, tipos de malware, ataques cibernéticos, criptografia e certificação digital. Para o policial, este conhecimento é operacional: a Polícia Federal possui divisão especializada em crimes cibernéticos, e todas as forças de segurança lidam diariamente com sistemas que exigem proteção contra invasões e vazamentos.

---

## 2. Princípios da Segurança da Informação (DICA)

| Princípio | Definição |
|---|---|
| **Disponibilidade** | A informação deve estar acessível sempre que necessário |
| **Integridade** | A informação não pode ser alterada de forma não autorizada |
| **Confidencialidade** | A informação só pode ser acessada por pessoas autorizadas |
| **Autenticidade** | Garantia de que a origem da informação é legítima |

Adicionalmente, dois princípios complementares:
* **Não-Repúdio (Irretratabilidade)**: O autor de uma ação não pode negar que a realizou (garantido pela assinatura digital).
* **Legalidade**: As operações com informação devem estar em conformidade com a legislação vigente.

---

## 3. Malware (Software Malicioso)

### 3.1. Tipos de Malware

| Tipo | Definição | Propagação |
|---|---|---|
| **Vírus** | Programa que se replica inserindo cópias de si mesmo em outros arquivos. Precisa de um hospedeiro para ser executado | Requer ação do usuario (abrir arquivo infectado) |
| **Worm (Verme)** | Programa que se propaga automaticamente pela rede, sem precisar de arquivo hospedeiro | Automática (explora vulnerabilidades de rede) |
| **Trojan (Cavalo de Troia)** | Programa que parece legítimo, mas executa funções maliciosas ocultas. NÃO se replica | Requer ação do usuario (instalar programa) |
| **Ransomware** | Malware que criptografa os arquivos da vítima e exige pagamento (resgate) para a descriptografia | Phishing, vulnerabilidades |
| **Spyware** | Programa espião que coleta informações do usuario sem consentimento (senhas, hábitos) | Instalação oculta junto a outros softwares |
| **Keylogger** | Subtipo de spyware que registra todas as teclas digitadas pelo usuario | Instalação oculta ou acesso físico |
| **Screenlogger** | Subtipo de spyware que captura imagens da tela do usuario | Instalação oculta |
| **Adware** | Exibe propagandas indesejadas. Pode ou não ser malicioso | Instalação junto a softwares gratuitos |
| **Rootkit** | Conjunto de ferramentas que permite acesso privilegiado oculto ao sistema, escondendo a presença do invasor | Exploração de vulnerabilidades |
| **Bot/Botnet** | Programa que permite controle remoto do computador. Quando vários bots são controlados em conjunto, formam uma botnet (rede zumbi) | Exploração de vulnerabilidades |
| **Backdoor** | Porta dos fundos: mecanismo que permite acesso remoto não autorizado ao sistema | Instalado por outros malwares ou pelo invasor |

---

## 4. Ataques Cibernéticos

| Ataque | Definição |
|---|---|
| **Phishing** | Fraude que utiliza e-mails, SMS ou sites falsos para roubar dados pessoais |
| **Pharming** | Redireciona o usuario para um site falso mesmo que digite o endereço correto (envenenamento de DNS) |
| **DoS / DDoS** | Negação de Serviço: sobrecarrega um servidor com requisições para tirá-lo do ar. DDoS usa múltiplas maquinas (botnet) |
| **Man-in-the-Middle** | Invasor intercepta a comunicação entre duas partes sem que elas percebam |
| **Engenharia Social** | Manipulação psicológica para obter informações confidenciais (ex: ligar fingindo ser do suporte técnico) |
| **Brute Force** | Tentativa de descobrir senhas testando todas as combinações possíveis |
| **SQL Injection** | Inserção de código SQL malicioso em formulários web para acessar bancos de dados |
| **Spoofing** | Falsificação de identidade (IP, e-mail, DNS) para se passar por outra entidade |
| **Defacement** | Alteração não autorizada da página inicial de um site (pichação digital) |

---

## 5. Criptografia

### 5.1. Criptografia Simétrica
* Utiliza a **mesma chave** para criptografar e descriptografar.
* Vantagem: Rápida.
* Desvantagem: A chave precisa ser compartilhada entre remetente e destinatário (risco de interceptação).
* Algoritmos: AES, DES, 3DES, RC4.

### 5.2. Criptografia Assimétrica
* Utiliza um **par de chaves**: chave pública (para criptografar) e chave privada (para descriptografar).
* Vantagem: Não precisa compartilhar a chave privada.
* Desvantagem: Mais lenta que a simétrica.
* Algoritmos: RSA, DSA, ECC.

### 5.3. Regra de Ouro para Provas
* **Confidencialidade**: O remetente criptografa com a chave **pública** do destinatário. Só o destinatário consegue descriptografar com sua chave **privada**.
* **Assinatura Digital**: O remetente assina com sua chave **privada**. Qualquer pessoa pode verificar com a chave **pública** do remetente.

---

## 6. Certificação Digital e Assinatura Digital

### 6.1. Assinatura Digital
* Mecanismo que garante **autenticidade**, **integridade** e **não-repúdio** de um documento eletrônico.
* Processo: O remetente gera um hash (resumo) do documento e o criptografa com sua chave privada. O destinatário descriptografa o hash com a chave pública do remetente e compara com o hash do documento recebido.
* **NÃO garante confidencialidade** (o documento pode ser lido por qualquer pessoa).

### 6.2. Certificado Digital
* Documento eletrônico emitido por uma **Autoridade Certificadora (AC)** que vincula uma chave pública a uma entidade (pessoa, empresa, site).
* Funciona como uma “identidade digital” que garante que a chave pública pertence realmente a quem diz pertencer.
* No Brasil, a **ICP-Brasil** (Infraestrutura de Chaves Públicas Brasileira) é a cadeia de certificação oficial.
* Tipos de certificados: **A1** (armazenado em software, validade 1 ano), **A3** (armazenado em token USB ou smart card, validade até 5 anos).

---

## 7. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PF — Agente)
**Enunciado**: Diferentemente do vírus, o worm não precisa de um programa hospedeiro para se propagar, pois é capaz de se replicar automaticamente por meio da rede.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário**: Esta é a diferença fundamental. O vírus precisa se anexar a um arquivo hospedeiro e depende da ação do usuario. O worm se propaga automaticamente pela rede, explorando vulnerabilidades, sem necessidade de hospedeiro.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: Na criptografia assimétrica, para garantir a confidencialidade de uma mensagem, o remetente deve criptografá-la com:
a) Sua própria chave privada
b) A chave pública do destinatário
c) A chave privada do destinatário
d) Sua própria chave pública
e) Uma chave simétrica compartilhada

* **Gabarito: B**
* **Comentário**: Para confidencialidade, o remetente usa a chave pública do destinatário para criptografar. Somente o destinatário, com sua chave privada, conseguirá descriptografar.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: O tipo de malware que criptografa os arquivos do computador da vítima e exige pagamento de resgate para restaurar o acesso é denominado:
a) Spyware
b) Adware
c) Rootkit
d) Ransomware
e) Trojan

* **Gabarito: D**
* **Comentário**: Ransomware é o malware que sequestra dados por meio de criptografia e cobra resgate (ransom) para liberá-los. Ataques famosos: WannaCry (2017), que afetou sistemas policiais e hospitalares em todo o mundo.

---

## 8. Pegadinhas Mais Frequentes

1. **Assinatura Digital NÃO garante confidencialidade**: Garante autenticidade, integridade e não-repúdio.
2. **Vírus precisa de ação do usuario; Worm se propaga sozinho**: Nunca confunda.
3. **Trojan NÃO se replica**: Diferente de vírus e worm. Ele se disfarça de programa legítimo.
4. **Criptografia Simétrica usa UMA chave; Assimétrica usa DUAS (pública e privada)**.

---

## 9. Quadro-Resumo

| Conceito | Característica-Chave |
|---|---|
| **Vírus** | Precisa de hospedeiro e ação do usuario |
| **Worm** | Autopropagação pela rede |
| **Trojan** | Disfarce; NÃO se replica |
| **Ransomware** | Criptografa arquivos; pede resgate |
| **Simétrica** | Uma chave (mesma para cifrar/decifrar) |
| **Assimétrica** | Duas chaves (pública + privada) |
| **Assinatura Digital** | Autenticidade + Integridade + Não-repúdio |
| **Certificado Digital** | Identidade digital emitida por AC |

---

## 10. Conclusão

A Segurança da Informação é a área mais densa de Informática para concursos, mas também a mais previsível. As bancas repetem os mesmos conceitos: diferenças entre tipos de malware, princípios DICA, criptografia simétrica vs. assimétrica e o funcionamento da assinatura/certificação digital. Estudar as tabelas comparativas e resolver questões anteriores é a estratégia mais eficaz.',
  'Estudo completo de Segurança da Informação para concursos policiais. Aborda os princípios DICA (Disponibilidade, Integridade, Confidencialidade, Autenticidade), tipos de malware (vírus, worm, trojan, ransomware, spyware, keylogger, rootkit, botnet), ataques cibernéticos (phishing, pharming, DoS/DDoS, engenharia social, SQL injection), criptografia simétrica e assimétrica, assinatura digital e certificação digital (ICP-Brasil). Inclui questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 7/8 — Backup, computação em nuvem, redes
-- =====================================================================
SELECT upsert_material(
  'informatica',
  'Backup, computação em nuvem, redes',
  'Backup, Computação em Nuvem e Redes de Computadores para Concursos',
  E'# Backup, Computação em Nuvem e Redes de Computadores

## 1. Introdução

A tríade backup-nuvem-redes forma a espinha dorsal da infraestrutura tecnológica das organizações policiais. As bancas CEBRASPE, FGV e VUNESP cobram desde os tipos de backup (completo, incremental, diferencial) até classificações de redes (LAN, MAN, WAN) e modelos de computação em nuvem (IaaS, PaaS, SaaS). Para o policial, entender esses conceitos é vital: a perda de um banco de dados de inquéritos por falta de backup ou a exposição de dados sigilosos por má configuração de nuvem podem comprometer investigações inteiras.

---

## 2. Backup (Cópia de Segurança)

### 2.1. Tipos de Backup

| Tipo | O que copia | Marca atributo de arquivo? | Tempo | Espaço |
|---|---|---|---|---|
| **Completo (Full)** | Todos os arquivos | Sim (desmarca) | Lento | Grande |
| **Incremental** | Apenas os arquivos alterados desde o último backup (qualquer tipo) | Sim (desmarca) | Rápido | Pequeno |
| **Diferencial** | Todos os arquivos alterados desde o último backup completo | Não (NÃO desmarca) | Médio | Médio (cresce) |

### 2.2. Estratégias de Restauração
* **Completo**: Basta restaurar o último backup completo.
* **Completo + Incremental**: Restaurar o último completo + todos os incrementais subsequentes (em ordem). Se perder um incremental intermediário, a restauração fica comprometida.
* **Completo + Diferencial**: Restaurar o último completo + apenas o último diferencial.

### 2.3. Regra 3-2-1 de Backup
* **3** cópias dos dados.
* **2** mídias diferentes (ex: disco + nuvem).
* **1** cópia fora do local físico (offsite).

---

## 3. Computação em Nuvem (Cloud Computing)

### 3.1. Definição
A computação em nuvem é o modelo de disponibilização de recursos computacionais (servidores, armazenamento, bancos de dados, redes, software) pela Internet, sob demanda, com pagamento conforme o uso.

### 3.2. Modelos de Serviço

| Modelo | O que oferece | Quem gerencia a infra | Exemplo |
|---|---|---|---|
| **IaaS** (Infrastructure as a Service) | Infraestrutura (servidores, redes, armazenamento) | O cliente gerencia o SO e os aplicativos | AWS EC2, Azure VMs, Google Compute |
| **PaaS** (Platform as a Service) | Plataforma de desenvolvimento | O provedor gerencia o SO; o cliente cuida do aplicativo | Google App Engine, Azure App Service |
| **SaaS** (Software as a Service) | Software pronto para uso | O provedor gerencia tudo | Gmail, Office 365, Google Docs |

### 3.3. Modelos de Implantação

| Modelo | Características |
|---|---|
| **Nuvem Pública** | Recursos compartilhados entre múltiplos clientes via Internet (AWS, Azure, GCP) |
| **Nuvem Privada** | Infraestrutura exclusiva de uma organização (on-premises ou hospedada) |
| **Nuvem Híbrida** | Combinação de nuvem pública e privada, com dados e aplicações podendo transitar entre elas |
| **Nuvem Comunitária** | Compartilhada entre organizações com interesses comuns (ex: órgãos de segurança pública) |

---

## 4. Redes de Computadores

### 4.1. Classificação por Abrangência

| Tipo | Abrangência | Exemplo |
|---|---|---|
| **PAN** | Pessoal (metros) | Bluetooth entre celular e fone |
| **LAN** | Local (prédio/escritório) | Rede da delegacia |
| **MAN** | Metropolitana (cidade) | Interligação de delegacias de uma cidade |
| **WAN** | Ampla (países/continentes) | A própria Internet |

### 4.2. Topologias de Rede

| Topologia | Descrição | Vantagem |
|---|---|---|
| **Estrela** | Todos os dispositivos conectados a um nó central (switch/hub) | Falha de um nó não derruba a rede |
| **Barramento** | Todos compartilham um único cabo principal | Simples e barato |
| **Anel** | Cada dispositivo conecta-se ao próximo, formando um círculo | Dados fluem em uma direção |
| **Malha (Mesh)** | Cada dispositivo conecta-se a vários outros | Alta redundância |

### 4.3. Equipamentos de Rede

| Equipamento | Função |
|---|---|
| **Hub** | Repete o sinal para todas as portas (broadcast). Camada 1 (Física) |
| **Switch** | Encaminha dados apenas para a porta de destino (mais inteligente que o hub). Camada 2 (Enlace) |
| **Roteador** | Interliga redes diferentes e decide o melhor caminho. Camada 3 (Rede) |
| **Modem** | Modula/demodula sinais (converte digital para analógico e vice-versa) |
| **Access Point** | Ponto de acesso para redes Wi-Fi |
| **Firewall** | Filtra o tráfego de rede com base em regras de segurança. Pode ser hardware ou software |

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PRF — Policial)
**Enunciado**: No backup incremental, são copiados apenas os arquivos que foram alterados desde o último backup realizado, independentemente de este ter sido um backup completo ou incremental.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário**: O backup incremental copia apenas os arquivos alterados desde o último backup de qualquer tipo (completo ou incremental). É o mais rápido de executar, mas a restauração exige todos os incrementais em sequência.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: O modelo de serviço de computação em nuvem em que o provedor oferece aplicativos prontos para uso, sem que o cliente precise se preocupar com infraestrutura, plataforma ou manutenção, é denominado:
a) IaaS
b) PaaS
c) SaaS
d) DaaS
e) FaaS

* **Gabarito: C**
* **Comentário**: SaaS (Software as a Service) oferece software pronto para uso pela Internet. O provedor gerencia toda a infraestrutura, plataforma e manutenção. Exemplos: Gmail, Google Docs, Office 365.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: O equipamento de rede que opera na camada de enlace do modelo OSI e encaminha quadros (frames) apenas para a porta de destino, com base no endereço MAC, é o:
a) Hub
b) Roteador
c) Modem
d) Switch
e) Repetidor

* **Gabarito: D**
* **Comentário**: O Switch opera na camada 2 (Enlace) e utiliza a tabela de endereços MAC para encaminhar os dados apenas para a porta correta, ao contrário do Hub que envia para todas as portas.

---

## 6. Pegadinhas Mais Frequentes

1. **Diferencial vs. Incremental**: O diferencial NÃO desmarca o atributo de arquivo (por isso cresce a cada execução). O incremental desmarca (por isso é menor).
2. **Hub é “burro”, Switch é “inteligente”**: Hub envia para todos (broadcast); Switch envia apenas para o destino.
3. **IaaS vs. SaaS**: IaaS oferece “maquina vazia” (o cliente instala tudo). SaaS oferece “programa pronto” (o cliente só usa).
4. **Nuvem Pública NÃO significa insegura**: Pública refere-se à disponibilidade para múltiplos clientes, não à falta de segurança.

---

## 7. Quadro-Resumo

| Conceito | Definição Rápida |
|---|---|
| **Backup Completo** | Copia tudo |
| **Backup Incremental** | Copia só o que mudou desde o último backup |
| **Backup Diferencial** | Copia o que mudou desde o último backup completo |
| **SaaS** | Software pronto (Gmail, Office 365) |
| **PaaS** | Plataforma de desenvolvimento |
| **IaaS** | Infraestrutura bruta (VMs) |
| **LAN** | Rede local |
| **WAN** | Rede ampla |
| **Switch** | Camada 2, encaminha por MAC |
| **Roteador** | Camada 3, encaminha por IP |

---

## 8. Conclusão

Backup, nuvem e redes formam um trio inseparável na prova de Informática. As questões são técnicas mas previsíveis, repetindo as mesmas comparações (incremental vs. diferencial, IaaS vs. SaaS, hub vs. switch). O candidato que domina as tabelas comparativas e entende a lógica por trás de cada conceito resolve essas questões com rapidez e segurança.',
  'Estudo de Backup, Computação em Nuvem e Redes de Computadores para concursos policiais. Aborda tipos de backup (completo, incremental, diferencial) e estratégias de restauração, modelos de nuvem (IaaS, PaaS, SaaS) e implantação (pública, privada, híbrida), classificação de redes (PAN, LAN, MAN, WAN), topologias (estrela, barramento, anel, malha) e equipamentos (hub, switch, roteador, firewall). Inclui questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 8/8 — Banco de dados (conceitos básicos) e Big Data
-- =====================================================================
SELECT upsert_material(
  'informatica',
  'Banco de dados (conceitos básicos) e Big Data',
  'Banco de Dados e Big Data: Conceitos Fundamentais para Concursos',
  E'# Banco de Dados e Big Data: Conceitos Fundamentais

## 1. Introdução

O estudo de Banco de Dados e Big Data é a parte mais conceitual da disciplina de Informática nos concursos policiais. As bancas CEBRASPE, FGV e VUNESP cobram definições, terminologia e diferenças entre modelos de dados (relacional vs. não relacional), além dos conceitos de Big Data e suas aplicações na área de segurança pública. Para o policial, o conhecimento de bancos de dados é operacional: sistemas como o INFOSEG (Rede de Integração Nacional de Informações de Segurança Pública) e os bancos de mandados de prisão dependem dessa tecnologia.

---

## 2. Conceitos Fundamentais de Banco de Dados

### 2.1. Definições Básicas
* **Banco de Dados (BD)**: Coleção organizada de dados armazenados de forma estruturada, que pode ser acessada, gerenciada e atualizada eletronicamente.
* **SGBD (Sistema de Gerenciamento de Banco de Dados)**: Software que controla o acesso ao banco de dados, gerencia a segurança, integridade e consistência dos dados. Exemplos: **PostgreSQL**, MySQL, Oracle, SQL Server, MongoDB.
* **SQL (Structured Query Language)**: Linguagem padrão para consultar e manipular bancos de dados relacionais.

### 2.2. Modelo Relacional
O modelo relacional é o mais cobrado em concursos. Nele, os dados são organizados em **tabelas** (relações), compostas por:
* **Linhas (Tuplas/Registros)**: Cada linha representa um registro individual (ex: um policial, um inquérito).
* **Colunas (Atributos/Campos)**: Cada coluna representa uma propriedade dos dados (ex: nome, matrícula, cargo).
* **Chave Primária (Primary Key)**: Campo (ou conjunto de campos) que identifica de forma única cada registro na tabela. Não pode ser nulo nem duplicado.
* **Chave Estrangeira (Foreign Key)**: Campo que referencia a chave primária de outra tabela, estabelecendo um relacionamento entre elas.

### 2.3. Operações SQL Básicas

| Comando | Função | Exemplo |
|---|---|---|
| **SELECT** | Consulta dados | SELECT nome FROM tabela_exemplo WHERE cargo = X |
| **INSERT** | Insere novos registros | INSERT INTO tabela_exemplo (nome, cargo) VALUES (X, Y) |
| **UPDATE** | Atualiza registros existentes | UPDATE tabela_exemplo SET cargo = X WHERE id = 1 |
| **DELETE** | Remove registros | DELETE FROM tabela_exemplo WHERE id = 1 |
| **CREATE TABLE** | Cria uma nova tabela | CREATE TABLE tabela_exemplo (id INT, nome VARCHAR) |

### 2.4. Normalização
Processo de organização das tabelas para **minimizar redundância** e **evitar anomalias** de inserção, exclusão e atualização. As formas normais mais cobradas:
* **1ª Forma Normal (1FN)**: Elimina grupos repetitivos; cada célula deve conter um único valor atômico.
* **2ª Forma Normal (2FN)**: Cumpre 1FN + elimina dependências parciais (todos os campos devem depender da chave primária completa).
* **3ª Forma Normal (3FN)**: Cumpre 2FN + elimina dependências transitivas (campos não-chave não podem depender de outros campos não-chave).

---

## 3. Bancos de Dados Não Relacionais (NoSQL)

Os bancos NoSQL são utilizados quando os dados não se encaixam bem em tabelas tradicionais ou quando é necessário escalabilidade massiva.

| Tipo | Estrutura | Exemplo de SGBD |
|---|---|---|
| **Documento** | Armazena dados em documentos JSON/BSON | MongoDB, CouchDB |
| **Chave-Valor** | Armazena pares simples de chave e valor | Redis, DynamoDB |
| **Colunar** | Armazena dados por colunas (otimizado para leitura) | Cassandra, HBase |
| **Grafos** | Armazena dados como nós e arestas (relacionamentos) | Neo4j |

---

## 4. Big Data

### 4.1. Definição
Big Data refere-se a conjuntos de dados tão volumosos, velozes e variados que não podem ser processados por ferramentas tradicionais de banco de dados. É caracterizado pelos **5 Vs**:

| V | Significado | Exemplo Policial |
|---|---|---|
| **Volume** | Quantidade massiva de dados | Bilhões de registros de interceptações |
| **Velocidade** | Dados gerados e processados em tempo real | Monitoramento de câmeras de segurança |
| **Variedade** | Dados estruturados, semi-estruturados e não estruturados | Textos, imagens, áudios, vídeos, redes sociais |
| **Veracidade** | Confiabilidade e qualidade dos dados | Filtragem de informações falsas em investigações |
| **Valor** | Capacidade de extrair insights úteis dos dados | Predição de crimes (policiamento preditivo) |

### 4.2. Tecnologias de Big Data
* **Hadoop**: Framework de código aberto para processamento distribuído de grandes conjuntos de dados.
* **MapReduce**: Modelo de programação para processamento paralelo de dados no Hadoop.
* **Apache Spark**: Plataforma de processamento em memória, mais rápida que o MapReduce.
* **Data Mining (Mineração de Dados)**: Técnicas para descobrir padrões ocultos em grandes volumes de dados.
* **Machine Learning / Inteligência Artificial**: Algoritmos que aprendem padrões nos dados para fazer previsões (ex: reconhecimento facial).

### 4.3. Aplicações em Segurança Pública
* **Policiamento Preditivo**: Algoritmos analisam dados históricos de crimes para prever onde e quando novas ocorrências são mais prováveis.
* **Reconhecimento Facial**: Sistemas de Big Data processam imagens de câmeras em tempo real para identificar suspeitos.
* **Análise de Redes Criminosas**: Bancos de dados de grafos mapeiam conexões entre membros de organizações criminosas.

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PF — Escrivão)
**Enunciado**: Em um banco de dados relacional, a chave primária de uma tabela é o campo que identifica de forma única cada registro e pode conter valores nulos.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: A chave primária NÃO pode conter valores nulos. Ela deve ser única e obrigatória para cada registro da tabela (restrição de integridade de entidade).

### Questão 2 (FGV — Senado Federal — Policial Legislativo)
**Enunciado**: O conceito de Big Data é definido por um conjunto de características conhecidas como os “5 Vs”. Assinale a alternativa que NÃO representa um dos 5 Vs do Big Data:
a) Volume
b) Velocidade
c) Versatilidade
d) Variedade
e) Valor

* **Gabarito: C**
* **Comentário**: Os 5 Vs do Big Data são: Volume, Velocidade, Variedade, Veracidade e Valor. “Versatilidade” não faz parte do conjunto canônico.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: Em SQL, o comando utilizado para recuperar dados de uma tabela de banco de dados é:
a) INSERT
b) UPDATE
c) DELETE
d) SELECT
e) CREATE

* **Gabarito: D**
* **Comentário**: O comando SELECT é utilizado para consultar (recuperar) dados de tabelas. INSERT insere novos dados, UPDATE atualiza, DELETE remove e CREATE cria estruturas.

---

## 6. Pegadinhas Mais Frequentes

1. **Chave Primária vs. Chave Estrangeira**: Primária identifica unicamente o registro NA PRÓPRIA tabela. Estrangeira referencia a chave primária de OUTRA tabela.
2. **SQL vs. NoSQL**: SQL é relacional (tabelas). NoSQL é para dados não estruturados ou semi-estruturados (documentos, grafos).
3. **Big Data não é apenas “muitos dados”**: É a combinação de Volume + Velocidade + Variedade + Veracidade + Valor.
4. **Hadoop vs. Spark**: Hadoop processa em disco (mais lento). Spark processa em memória (mais rápido).

---

## 7. Quadro-Resumo

| Conceito | Definição Rápida |
|---|---|
| **SGBD** | Software que gerencia bancos de dados |
| **Chave Primária** | Identificador único de cada registro |
| **Chave Estrangeira** | Referência à chave primária de outra tabela |
| **SQL** | Linguagem para bancos relacionais |
| **NoSQL** | Bancos para dados não estruturados |
| **Big Data (5 Vs)** | Volume, Velocidade, Variedade, Veracidade, Valor |

---

## 8. Conclusão

Banco de Dados e Big Data são temas conceituais que exigem mais memorização do que raciocínio matemático. O candidato que compreende o modelo relacional (tabelas, chaves, SQL) e memoriza os 5 Vs do Big Data está preparado para resolver a maioria das questões. Na carreira policial, esses conhecimentos são cada vez mais relevantes, com a crescente digitalização das investigações e o uso de inteligência artificial em segurança pública.',
  'Estudo de Banco de Dados e Big Data para concursos policiais. Aborda conceitos do modelo relacional (tabelas, chaves primária e estrangeira, normalização), comandos SQL básicos (SELECT, INSERT, UPDATE, DELETE), bancos NoSQL (documento, chave-valor, colunar, grafos) e Big Data (5 Vs: Volume, Velocidade, Variedade, Veracidade, Valor). Inclui tecnologias de Big Data (Hadoop, Spark, Data Mining) e aplicações em segurança pública. Questões resolvidas do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- Limpeza
-- =====================================================================
DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
