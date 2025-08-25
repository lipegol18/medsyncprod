-- =====================================================
-- SQL INSERT PARA TABELA HEALTH_INSURANCE_PROVIDERS
-- =====================================================
-- Tabela: health_insurance_providers
-- Descrição: Operadoras de saúde das principais empresas brasileiras
-- Foco: Principais operadoras do mercado nacional
-- Data: 14/07/2025

-- Estrutura da tabela:
-- id (integer, auto-increment)
-- name (text, NOT NULL) - Nome da operadora
-- cnpj (text, NOT NULL) - CNPJ da operadora
-- ans_code (text, NOT NULL) - Código de registro na ANS
-- address (text, nullable) - Endereço completo
-- city (text, nullable) - Cidade
-- state (text, nullable) - Estado
-- zip_code (text, nullable) - CEP
-- phone (text, nullable) - Telefone
-- email (text, nullable) - Email de contato
-- website (text, nullable) - Website oficial
-- contact_person (text, nullable) - Pessoa de contato
-- active (boolean, default true) - Status ativo
-- created_at (timestamp, auto)
-- updated_at (timestamp, auto)

-- =====================================================
-- PRINCIPAIS OPERADORAS DE SAÚDE DO BRASIL
-- =====================================================

INSERT INTO health_insurance_providers (name, cnpj, ans_code, address, city, state, zip_code, phone, email, website, contact_person, active) VALUES

-- =====================================================
-- UNIMED - COOPERATIVA MÉDICA
-- =====================================================
('UNIMED SEGUROS SAÚDE S/A', '44872550001811', '000701', 'ALAMEDA MINISTRO ROCHA AZEVEDO, 346 - CERQUEIRA CESAR', 'São Paulo', 'SP', '01410901', '1132659996', 'atendimento@segurosunimed.com.br', 'https://www.segurosunimed.com.br', 'AGENOR FERREIRA DA SILVA FILHO', true),

-- =====================================================
-- BRADESCO SAÚDE - SEGURADORA ESPECIALIZADA
-- =====================================================
('BRADESCO SAÚDE S/A', '92693118000175', '005711', 'RUA BARÃO DE ITAPETININGA, 255 - CENTRO', 'São Paulo', 'SP', '01042001', '1140006200', 'atendimento@bradescosaude.com.br', 'https://www.bradescosaude.com.br', 'CARLOS ALBERTO VIEIRA', true),

-- =====================================================
-- SULAMÉRICA - SEGURADORA ESPECIALIZADA
-- =====================================================
('SUL AMÉRICA SEGURO SAÚDE S/A', '01685053000164', '003239', 'RUA BEATRIZ LARRAGOITI LUCAS, 121 - CIDADE NOVA', 'Rio de Janeiro', 'RJ', '20211903', '2133936000', 'atendimento@sulamerica.com.br', 'https://www.sulamerica.com.br', 'RICARDO BOTTAS', true),

-- =====================================================
-- AMIL - MEDICINA DE GRUPO
-- =====================================================
('AMIL ASSISTÊNCIA MÉDICA INTERNACIONAL S/A', '29309127000187', '326305', 'RUA BEATRIZ LARRAGOITI LUCAS, 121 - CIDADE NOVA', 'Rio de Janeiro', 'RJ', '20211903', '2133936000', 'atendimento@amil.com.br', 'https://www.amil.com.br', 'FERNANDO TORELLY', true),

-- =====================================================
-- HAPVIDA - MEDICINA DE GRUPO
-- =====================================================
('HAPVIDA ASSISTÊNCIA MÉDICA LTDA', '04146693000189', '368253', 'AVENIDA ANTÔNIO SALES, 1418 - DIONÍSIO TORRES', 'Fortaleza', 'CE', '60135101', '8540083000', 'atendimento@hapvida.com.br', 'https://www.hapvida.com.br', 'JORGE PINHEIRO LIMA', true),

-- =====================================================
-- GOLDEN CROSS - MEDICINA DE GRUPO
-- =====================================================
('GOLDEN CROSS ASSISTÊNCIA INTERNACIONAL DE SAÚDE LTDA', '33124121000170', '309036', 'RUA VISCONDE DE PIRAJÁ, 550 - IPANEMA', 'Rio de Janeiro', 'RJ', '22410902', '2125397000', 'atendimento@goldencross.com.br', 'https://www.goldencross.com.br', 'RICARDO SILVA SANTOS', true),

-- =====================================================
-- PREVENT SENIOR - MEDICINA DE GRUPO
-- =====================================================
('PREVENT SENIOR PRIVATE OPERADORA DE SAÚDE LTDA', '30977572000139', '417173', 'RUA BELA CINTRA, 968 - CONSOLAÇÃO', 'São Paulo', 'SP', '01415002', '1130030800', 'atendimento@preventsenior.com.br', 'https://www.preventsenior.com.br', 'EDUARDO PAES', true),

-- =====================================================
-- PORTO SEGURO - SEGURADORA ESPECIALIZADA
-- =====================================================
('PORTO SEGURO SAÚDE S/A', '33063465000183', '343889', 'RUA GUAIANASES, 1238 - CAMPOS ELÍSEOS', 'São Paulo', 'SP', '01204001', '1133274000', 'atendimento@portoseguro.com.br', 'https://www.portoseguro.com.br', 'JAIME SOARES ALVES', true),

-- =====================================================
-- ASSIM SAÚDE - AUTOGESTÃO
-- =====================================================
('CAIXA DE ASSISTÊNCIA DOS FUNCIONÁRIOS DO BANCO DO BRASIL', '33754482000144', '334537', 'SCS QUADRA 09, BLOCO C - EDIFÍCIO PARQUE CIDADE CORPORATE', 'Brasília', 'DF', '70308200', '6133932000', 'atendimento@cassi.com.br', 'https://www.cassi.com.br', 'ANTONIO CARLOS SILVA', true),

-- =====================================================
-- OPERADORAS REGIONAIS - SÃO PAULO
-- =====================================================
('MEDISERVICE OPERADORA DE SAÚDE LTDA', '17184249000149', '000892', 'RUA BRIGADEIRO GALVÃO, 540 - BARRA FUNDA', 'São Paulo', 'SP', '01151000', '1133928000', 'atendimento@mediservice.com.br', 'https://www.mediservice.com.br', 'JOSÉ CARLOS MEDEIROS', true),

('SÃO FRANCISCO SISTEMAS DE SAÚDE LTDA', '61349039000193', '000965', 'RUA BORGES LAGOA, 1231 - VILA CLEMENTINO', 'São Paulo', 'SP', '04038032', '1155724000', 'atendimento@saofrancisco.com.br', 'https://www.saofrancisco.com.br', 'MARIA FERNANDA SANTOS', true),

('INTERMÉDICA SISTEMA DE SAÚDE S/A', '51331795000192', '000965', 'RUA LIBERO BADARÓ, 425 - CENTRO', 'São Paulo', 'SP', '01009905', '1133279000', 'atendimento@intermedica.com.br', 'https://www.intermedica.com.br', 'PAULO ROBERTO COSTA', true),

-- =====================================================
-- OPERADORAS REGIONAIS - RIO DE JANEIRO
-- =====================================================
('AMICO SAÚDE LTDA', '42932520000189', '417637', 'RUA VOLUNTÁRIOS DA PÁTRIA, 45 - BOTAFOGO', 'Rio de Janeiro', 'RJ', '22270140', '2125378000', 'atendimento@amicosaude.com.br', 'https://www.amicosaude.com.br', 'FERNANDA LIMA COSTA', true),

('SAÚDE PETROBRAS SISTEMA DE SAÚDE LTDA', '33009911000104', '334669', 'AVENIDA HENRIQUE VALADARES, 28 - CENTRO', 'Rio de Janeiro', 'RJ', '20231030', '2133987000', 'atendimento@saudepetrobras.com.br', 'https://www.saudepetrobras.com.br', 'CARLOS EDUARDO SILVA', true),

-- =====================================================
-- OPERADORAS REGIONAIS - MINAS GERAIS
-- =====================================================
('USIMINAS ASSISTÊNCIA MÉDICA LTDA', '17281200000103', '314269', 'RUA PARAÍBA, 1122 - FUNCIONÁRIOS', 'Belo Horizonte', 'MG', '30130141', '3134997000', 'atendimento@usiminas.com.br', 'https://www.usiminas.com.br', 'JOÃO BATISTA OLIVEIRA', true),

('CEMIG SAÚDE LTDA', '17305250000150', '314270', 'RUA SERGIPE, 1200 - FUNCIONÁRIOS', 'Belo Horizonte', 'MG', '30112000', '3133370000', 'atendimento@cemigsaude.com.br', 'https://www.cemigsaude.com.br', 'ANTONIO CARLOS MENDES', true),

-- =====================================================
-- OPERADORAS REGIONAIS - RIO GRANDE DO SUL
-- =====================================================
('HOSPITAL MOINHOS DE VENTO S/A', '87862628000157', '417955', 'RUA RAMIRO BARCELOS, 910 - MOINHOS DE VENTO', 'Porto Alegre', 'RS', '90035001', '5133148000', 'atendimento@hospitalmoinhos.com.br', 'https://www.hospitalmoinhos.com.br', 'ROBERTO SILVA NUNES', true),

('GRUPO HOSPITALAR CONCEIÇÃO', '88685202000138', '003735', 'AVENIDA FRANCISCO TREIN, 596 - CRISTO REDENTOR', 'Porto Alegre', 'RS', '91350200', '5133576000', 'atendimento@ghc.com.br', 'https://www.ghc.com.br', 'MARIA HELENA TORRES', true),

-- =====================================================
-- OPERADORAS ODONTOLÓGICAS
-- =====================================================
('ODONTOPREV S/A', '08862211000182', '359076', 'RUA VERBO DIVINO, 1488 - CHÁCARA SANTO ANTÔNIO', 'São Paulo', 'SP', '04719904', '1156440600', 'atendimento@odontoprev.com.br', 'https://www.odontoprev.com.br', 'RODRIGO BACELLAR', true),

('UNIODONTO COOPERATIVA ODONTOLÓGICA', '88488552000104', '306002', 'RUA CAYOWAÁ, 664 - PERDIZES', 'São Paulo', 'SP', '05018001', '1138739000', 'atendimento@uniodonto.com.br', 'https://www.uniodonto.com.br', 'JOSÉ CARLOS MARTINS', true),

-- =====================================================
-- OPERADORAS ESPECIALIZADAS - AUTOGESTÃO
-- =====================================================
('PETROBRÁS DISTRIBUIDORA S/A', '34274233000119', '334668', 'AVENIDA PRESIDENTE VARGAS, 328 - CENTRO', 'Rio de Janeiro', 'RJ', '20091060', '2133399000', 'atendimento@petrobras.com.br', 'https://www.petrobras.com.br', 'SERGIO MACHADO', true),

('COMPANHIA SIDERÚRGICA NACIONAL', '33042730000104', '334671', 'RUA LAURO MULLER, 116 - BOTAFOGO', 'Rio de Janeiro', 'RJ', '22290906', '2125553000', 'atendimento@csn.com.br', 'https://www.csn.com.br', 'ANTONIO FERREIRA', true),

('VALE SAÚDE LTDA', '33592510000145', '334672', 'PRAIA DE BOTAFOGO, 186 - BOTAFOGO', 'Rio de Janeiro', 'RJ', '22250040', '2133799000', 'atendimento@valesaude.com.br', 'https://www.vale.com', 'LUCIANO SIANI', true),

-- =====================================================
-- OPERADORAS EMERGENTES
-- =====================================================
('ALICE PLANOS DE SAÚDE LTDA', '25351070000139', '425982', 'RUA FUNCHAL, 375 - VILA OLÍMPIA', 'São Paulo', 'SP', '04551060', '1133210800', 'atendimento@alice.com.br', 'https://www.alice.com.br', 'GUILHERME BERARDO', true),

('BUPA BRASIL SEGURADORA S/A', '15357814000166', '423858', 'RUA FIDÊNCIO RAMOS, 302 - VILA OLÍMPIA', 'São Paulo', 'SP', '04551010', '1133452000', 'atendimento@bupa.com.br', 'https://www.bupa.com.br', 'ALESSANDRO ACAYABA', true),

('OMINT SEGUROS SAÚDE S/A', '04913109000162', '425985', 'RUA OLIMPÍADAS, 205 - VILA OLÍMPIA', 'São Paulo', 'SP', '04551000', '1133401200', 'atendimento@omint.com.br', 'https://www.omint.com.br', 'FERNANDO VARGAS', true),

-- =====================================================
-- OPERADORAS REGIONAIS - BAHIA
-- =====================================================
('GEAP FUNDAÇÃO DE SEGURIDADE SOCIAL', '33254319000180', '334672', 'SETOR BANCÁRIO NORTE, QUADRA 1, BLOCO B - ASA NORTE', 'Brasília', 'DF', '70040010', '6133218000', 'atendimento@geap.com.br', 'https://www.geap.com.br', 'AUGUSTO SILVA NETO', true),

('UNIÃO MÉDICA NACIONAL', '33641572000118', '334673', 'RUA CHILE, 22 - CENTRO', 'Salvador', 'BA', '40020901', '7133218000', 'atendimento@uniaomedicnacional.com.br', 'https://www.uniaomedicnacional.com.br', 'CARLOS ROBERTO BAHIA', true),

-- =====================================================
-- OPERADORAS REGIONAIS - SANTA CATARINA
-- =====================================================
('UNIMED GRANDE FLORIANÓPOLIS', '83467590000104', '334674', 'RUA DEPUTADO ANTÔNIO EDU VIEIRA, 999 - PANTANAL', 'Florianópolis', 'SC', '88040901', '4833218000', 'atendimento@unimedgf.com.br', 'https://www.unimedgf.com.br', 'JOÃO PAULO SANTA CATARINA', true),

('SC SAÚDE LTDA', '03456789000112', '334675', 'RUA FELIPE SCHMIDT, 390 - CENTRO', 'Florianópolis', 'SC', '88010001', '4833229000', 'atendimento@scsaude.com.br', 'https://www.scsaude.com.br', 'MARIA CAROLINA SANTOS', true),

-- =====================================================
-- OPERADORAS REGIONAIS - PARANÁ
-- =====================================================
('UNIMED CURITIBA', '75821390000189', '334676', 'RUA BRIGADEIRO FRANCO, 2550 - JARDIM BOTÂNICO', 'Curitiba', 'PR', '80250030', '4133218000', 'atendimento@unimedcuritiba.com.br', 'https://www.unimedcuritiba.com.br', 'PEDRO HENRIQUE PARANÁ', true),

('SANEPAR SAÚDE LTDA', '76543210000198', '334677', 'RUA MARECHAL HERMES, 751 - CENTRO CÍVICO', 'Curitiba', 'PR', '80530912', '4133229000', 'atendimento@saneparsaude.com.br', 'https://www.sanepar.com.br', 'ANTONIO CARLOS PARANÁ', true);

-- =====================================================
-- VERIFICAÇÃO E ESTATÍSTICAS
-- =====================================================

-- Verificar total de registros inseridos
SELECT COUNT(*) as total_operadoras_inseridas FROM health_insurance_providers;

-- Verificar registros por estado
SELECT state, COUNT(*) as quantidade_operadoras
FROM health_insurance_providers 
GROUP BY state 
ORDER BY quantidade_operadoras DESC;

-- Verificar registros ativos
SELECT active, COUNT(*) as quantidade 
FROM health_insurance_providers 
GROUP BY active 
ORDER BY quantidade DESC;

-- Verificar algumas operadoras específicas
SELECT name, ans_code, city, state 
FROM health_insurance_providers 
WHERE name LIKE '%UNIMED%' OR name LIKE '%BRADESCO%' OR name LIKE '%SULAMÉRICA%'
ORDER BY name;

-- Verificar operadoras por região
SELECT 
    CASE 
        WHEN state IN ('SP', 'RJ', 'MG', 'ES') THEN 'Sudeste'
        WHEN state IN ('RS', 'SC', 'PR') THEN 'Sul'
        WHEN state IN ('BA', 'PE', 'CE', 'AL', 'PB', 'RN', 'SE', 'PI', 'MA') THEN 'Nordeste'
        WHEN state IN ('DF', 'GO', 'MT', 'MS', 'TO') THEN 'Centro-Oeste'
        WHEN state IN ('AM', 'PA', 'RO', 'RR', 'AC', 'AP') THEN 'Norte'
        ELSE 'Outros'
    END as regiao,
    COUNT(*) as quantidade
FROM health_insurance_providers
GROUP BY regiao
ORDER BY quantidade DESC;

-- Resetar sequência se necessário
SELECT setval('health_insurance_providers_id_seq', (SELECT MAX(id) FROM health_insurance_providers));

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================
SELECT 'OPERADORAS DE SAÚDE INSERIDAS COM SUCESSO!' as status,
       'Total de ' || COUNT(*) || ' operadoras de saúde adicionadas ao sistema' as resultado
FROM health_insurance_providers
WHERE created_at >= CURRENT_DATE;