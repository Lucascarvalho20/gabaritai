-- =====================================================================
-- SEED — Preenche legislação dos 8 materiais do Penal Batch 14
-- =====================================================================
-- Pré-requisito: rodar antes 2026-06-09-add-legislacao-materials.sql
-- =====================================================================

-- Função auxiliar para atualizar legislação por título do material
CREATE OR REPLACE FUNCTION set_legislacao(p_title text, p_leis jsonb) RETURNS void AS $func$
BEGIN
  UPDATE "materials" SET "legislacao" = p_leis
  WHERE title = p_title;
END;
$func$ LANGUAGE plpgsql;

-- =====================================================================
-- HOMICÍDIO (CP 121)
-- =====================================================================
SELECT set_legislacao(
  'Homicídio (CP 121): simples, privilegiado, qualificado, culposo e majorantes',
  $leis$[
    {"nome": "Código Penal — art. 121 (Homicídio)", "lei": "Decreto-Lei 2.848/40", "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm#art121"},
    {"nome": "Lei 13.104/15 — Feminicídio", "lei": "Lei 13.104/15", "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13104.htm"},
    {"nome": "Lei 13.142/15 — Homicídio contra agente da segurança pública", "lei": "Lei 13.142/15", "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13142.htm"},
    {"nome": "Lei 13.964/19 — Pacote Anticrime", "lei": "Lei 13.964/19", "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13964.htm"},
    {"nome": "Lei 8.072/90 — Crimes Hediondos", "lei": "Lei 8.072/90", "url": "https://www.planalto.gov.br/ccivil_03/leis/l8072.htm"}
  ]$leis$
);

-- =====================================================================
-- LESÃO CORPORAL (CP 129)
-- =====================================================================
SELECT set_legislacao(
  'Lesão Corporal (CP 129): leve, grave, gravíssima, seguida de morte, doméstica',
  $leis$[
    {"nome": "Código Penal — art. 129 (Lesão Corporal)", "lei": "Decreto-Lei 2.848/40", "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm#art129"},
    {"nome": "Lei Maria da Penha — Lei 11.340/06", "lei": "Lei 11.340/06", "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm"},
    {"nome": "Lei 13.984/20 — Aumento em vítima criança/idoso", "lei": "Lei 13.984/20", "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l13984.htm"}
  ]$leis$
);

-- =====================================================================
-- PERICLITAÇÃO DA VIDA E DA SAÚDE
-- =====================================================================
SELECT set_legislacao(
  'Periclitação: perigo para a vida e saúde de outrem (CP 130-136)',
  $leis$[
    {"nome": "Código Penal — arts. 130 a 136", "lei": "Decreto-Lei 2.848/40", "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm#art130"},
    {"nome": "Lei de Tortura — Lei 9.455/97", "lei": "Lei 9.455/97", "url": "https://www.planalto.gov.br/ccivil_03/leis/l9455.htm"},
    {"nome": "Código de Trânsito Brasileiro — art. 304 (Omissão de Socorro)", "lei": "Lei 9.503/97", "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm#art304"}
  ]$leis$
);

-- =====================================================================
-- CRIMES CONTRA A HONRA
-- =====================================================================
SELECT set_legislacao(
  'Crimes contra a Honra: Calúnia, Difamação e Injúria (CP 138-145)',
  $leis$[
    {"nome": "Código Penal — arts. 138 a 145", "lei": "Decreto-Lei 2.848/40", "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm#art138"},
    {"nome": "Lei 14.532/23 — Equiparação da Injúria Racial ao Racismo", "lei": "Lei 14.532/23", "url": "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/L14532.htm"},
    {"nome": "Lei 7.716/89 — Crimes de Racismo", "lei": "Lei 7.716/89", "url": "https://www.planalto.gov.br/ccivil_03/leis/l7716.htm"},
    {"nome": "Lei 13.964/19 — Pacote Anticrime (pena dobrada em redes sociais)", "lei": "Lei 13.964/19", "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13964.htm"}
  ]$leis$
);

-- =====================================================================
-- CRIMES CONTRA A LIBERDADE PESSOAL
-- =====================================================================
SELECT set_legislacao(
  'Crimes contra a Liberdade: Constrangimento Ilegal, Ameaça, Sequestro, Cárcere Privado (CP 146-149)',
  $leis$[
    {"nome": "Código Penal — arts. 146 a 149", "lei": "Decreto-Lei 2.848/40", "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm#art146"},
    {"nome": "Lei Maria da Penha — Lei 11.340/06 (ação incondicionada)", "lei": "Lei 11.340/06", "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm"},
    {"nome": "Constituição Federal — art. 243 (confisco de propriedade em trabalho escravo)", "lei": "CF/88", "url": "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art243"}
  ]$leis$
);

-- =====================================================================
-- FURTO (CP 155)
-- =====================================================================
SELECT set_legislacao(
  'Furto: simples, qualificado, privilegiado, noturno (CP 155)',
  $leis$[
    {"nome": "Código Penal — art. 155 (Furto)", "lei": "Decreto-Lei 2.848/40", "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm#art155"},
    {"nome": "Lei 13.654/18 — Furto com explosivo (§ 4º-A)", "lei": "Lei 13.654/18", "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13654.htm"},
    {"nome": "Lei 14.155/21 — Furto eletrônico (§ 4º-B)", "lei": "Lei 14.155/21", "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14155.htm"},
    {"nome": "Lei 13.330/16 — Furto de semovente (§ 6º)", "lei": "Lei 13.330/16", "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13330.htm"}
  ]$leis$
);

-- =====================================================================
-- ROUBO (CP 157)
-- =====================================================================
SELECT set_legislacao(
  'Roubo: simples, majorado, latrocínio (CP 157)',
  $leis$[
    {"nome": "Código Penal — art. 157 (Roubo)", "lei": "Decreto-Lei 2.848/40", "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm#art157"},
    {"nome": "Lei 13.654/18 — Arma de fogo no roubo (§ 2º-A)", "lei": "Lei 13.654/18", "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13654.htm"},
    {"nome": "Lei 13.964/19 — Pacote Anticrime (arma restrita § 2º-B)", "lei": "Lei 13.964/19", "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13964.htm"},
    {"nome": "Lei 8.072/90 — Crimes Hediondos (latrocínio)", "lei": "Lei 8.072/90", "url": "https://www.planalto.gov.br/ccivil_03/leis/l8072.htm"}
  ]$leis$
);

-- =====================================================================
-- EXTORSÃO (CP 158-159)
-- =====================================================================
SELECT set_legislacao(
  'Extorsão e Extorsão Mediante Sequestro (CP 158-159)',
  $leis$[
    {"nome": "Código Penal — art. 158 (Extorsão)", "lei": "Decreto-Lei 2.848/40", "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm#art158"},
    {"nome": "Código Penal — art. 159 (Extorsão Mediante Sequestro)", "lei": "Decreto-Lei 2.848/40", "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm#art159"},
    {"nome": "Lei 8.072/90 — Crimes Hediondos", "lei": "Lei 8.072/90", "url": "https://www.planalto.gov.br/ccivil_03/leis/l8072.htm"},
    {"nome": "Lei 12.850/13 — Organizações Criminosas (delação premiada)", "lei": "Lei 12.850/13", "url": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12850.htm"}
  ]$leis$
);

-- =====================================================================
-- Limpeza
-- =====================================================================
DROP FUNCTION IF EXISTS set_legislacao(text, jsonb);

-- =====================================================================
-- FIM do seed — 8 materiais com links oficiais do Planalto
-- =====================================================================
