-- =====================================================
-- SQL INSERT PARA TABELA HEALTH_INSURANCE_PLANS
-- =====================================================
-- Tabela: health_insurance_plans
-- Descrição: Planos de saúde das principais operadoras brasileiras
-- Foco: Operadoras de grande porte com abrangência nacional
-- Data: 14/07/2025

-- Estrutura da tabela:
-- id (integer, auto-increment)
-- registro_ans (text, NOT NULL) - Código ANS da operadora
-- cd_plano (text, NOT NULL) - Código do plano
-- modalidade (text, nullable) - Modalidade do plano
-- segmentacao (text, nullable) - Segmentação assistencial
-- acomodacao (text, nullable) - Tipo de acomodação
-- tipo_contratacao (text, nullable) - Tipo de contratação
-- abrangencia_geografica (text, nullable) - Abrangência geográfica
-- situacao (text, nullable) - Situação do plano
-- dt_inicio_comercializacao (text, nullable) - Data de início
-- nm_plano (text, nullable) - Nome do plano
-- created_at (timestamp, auto)

-- =====================================================
-- UNIMED (Registro ANS: 000701)
-- =====================================================

INSERT INTO health_insurance_plans (registro_ans, cd_plano, modalidade, segmentacao, acomodacao, tipo_contratacao, abrangencia_geografica, situacao, dt_inicio_comercializacao, nm_plano) VALUES
-- Unimed - Planos Empresariais
('000701', 'UNI001', 'Cooperativa Médica', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Unimed Prático'),
('000701', 'UNI002', 'Cooperativa Médica', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Unimed Versátil'),
('000701', 'UNI003', 'Cooperativa Médica', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Unimed Dinâmico'),
('000701', 'UNI004', 'Cooperativa Médica', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Unimed Líder'),
('000701', 'UNI005', 'Cooperativa Médica', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Unimed Executivo'),

-- Unimed - Planos Individuais
('000701', 'UNI101', 'Cooperativa Médica', 'Médico-hospitalar', 'Enfermaria', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Unimed Individual Básico'),
('000701', 'UNI102', 'Cooperativa Médica', 'Médico-hospitalar', 'Apartamento', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Unimed Individual Confort'),
('000701', 'UNI103', 'Cooperativa Médica', 'Médico-hospitalar', 'Apartamento', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Unimed Individual Master'),

-- Unimed - Planos Odontológicos
('000701', 'UNI201', 'Cooperativa Médica', 'Odontológico', 'Não se aplica', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Unimed Odonto Empresarial'),
('000701', 'UNI202', 'Cooperativa Médica', 'Odontológico', 'Não se aplica', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Unimed Odonto Individual'),

-- =====================================================
-- BRADESCO SAÚDE (Registro ANS: 005711)
-- =====================================================

-- Bradesco - Planos Empresariais
('005711', 'BRA001', 'Seguradora Especializada', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Bradesco Saúde Clássico'),
('005711', 'BRA002', 'Seguradora Especializada', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Bradesco Saúde Confort'),
('005711', 'BRA003', 'Seguradora Especializada', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Bradesco Saúde Premium'),
('005711', 'BRA004', 'Seguradora Especializada', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Bradesco Saúde Top'),

-- Bradesco - Planos Individuais
('005711', 'BRA101', 'Seguradora Especializada', 'Médico-hospitalar', 'Enfermaria', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Bradesco Individual Básico'),
('005711', 'BRA102', 'Seguradora Especializada', 'Médico-hospitalar', 'Apartamento', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Bradesco Individual Premium'),

-- =====================================================
-- SULAMÉRICA (Registro ANS: 003239)
-- =====================================================

-- SulAmérica - Planos Empresariais
('003239', 'SUL001', 'Seguradora Especializada', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'SulAmérica Direto'),
('003239', 'SUL002', 'Seguradora Especializada', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'SulAmérica Clássico'),
('003239', 'SUL003', 'Seguradora Especializada', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'SulAmérica Executivo'),
('003239', 'SUL004', 'Seguradora Especializada', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'SulAmérica Especial'),

-- SulAmérica - Planos Individuais
('003239', 'SUL101', 'Seguradora Especializada', 'Médico-hospitalar', 'Enfermaria', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'SulAmérica Individual Básico'),
('003239', 'SUL102', 'Seguradora Especializada', 'Médico-hospitalar', 'Apartamento', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'SulAmérica Individual Master'),

-- =====================================================
-- AMIL (Registro ANS: 326305)
-- =====================================================

-- Amil - Planos Empresariais
('326305', 'AMI001', 'Medicina De Grupo', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Amil Básico'),
('326305', 'AMI002', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Amil Intermediário'),
('326305', 'AMI003', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Amil Executivo'),
('326305', 'AMI004', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Amil Premium'),

-- Amil - Planos Individuais
('326305', 'AMI101', 'Medicina De Grupo', 'Médico-hospitalar', 'Enfermaria', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Amil Individual Básico'),
('326305', 'AMI102', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Amil Individual Premium'),

-- =====================================================
-- HAPVIDA (Registro ANS: 368253)
-- =====================================================

-- Hapvida - Planos Empresariais
('368253', 'HAP001', 'Medicina De Grupo', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Regional', 'Ativa', '2024-01-01', 'Hapvida Básico'),
('368253', 'HAP002', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Regional', 'Ativa', '2024-01-01', 'Hapvida Intermediário'),
('368253', 'HAP003', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Regional', 'Ativa', '2024-01-01', 'Hapvida Premium'),

-- Hapvida - Planos Individuais
('368253', 'HAP101', 'Medicina De Grupo', 'Médico-hospitalar', 'Enfermaria', 'Individual ou familiar', 'Regional', 'Ativa', '2024-01-01', 'Hapvida Individual Básico'),
('368253', 'HAP102', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Individual ou familiar', 'Regional', 'Ativa', '2024-01-01', 'Hapvida Individual Premium'),

-- =====================================================
-- GOLDEN CROSS (Registro ANS: 309036)
-- =====================================================

-- Golden Cross - Planos Empresariais
('309036', 'GOL001', 'Medicina De Grupo', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Estadual', 'Ativa', '2024-01-01', 'Golden Cross Básico'),
('309036', 'GOL002', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Estadual', 'Ativa', '2024-01-01', 'Golden Cross Intermediário'),
('309036', 'GOL003', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Estadual', 'Ativa', '2024-01-01', 'Golden Cross Premium'),

-- Golden Cross - Planos Individuais
('309036', 'GOL101', 'Medicina De Grupo', 'Médico-hospitalar', 'Enfermaria', 'Individual ou familiar', 'Estadual', 'Ativa', '2024-01-01', 'Golden Cross Individual Básico'),
('309036', 'GOL102', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Individual ou familiar', 'Estadual', 'Ativa', '2024-01-01', 'Golden Cross Individual Premium'),

-- =====================================================
-- PREVENT SENIOR (Registro ANS: 417173)
-- =====================================================

-- Prevent Senior - Planos Empresariais
('417173', 'PRE001', 'Medicina De Grupo', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Prevent Senior Básico'),
('417173', 'PRE002', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Prevent Senior Intermediário'),
('417173', 'PRE003', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Prevent Senior Premium'),

-- Prevent Senior - Planos Individuais
('417173', 'PRE101', 'Medicina De Grupo', 'Médico-hospitalar', 'Enfermaria', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Prevent Senior Individual Básico'),
('417173', 'PRE102', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Prevent Senior Individual Premium'),

-- =====================================================
-- PORTO SEGURO (Registro ANS: 343889)
-- =====================================================

-- Porto Seguro - Planos Empresariais
('343889', 'POR001', 'Seguradora Especializada', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Porto Seguro Básico'),
('343889', 'POR002', 'Seguradora Especializada', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Porto Seguro Intermediário'),
('343889', 'POR003', 'Seguradora Especializada', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Porto Seguro Premium'),

-- Porto Seguro - Planos Individuais
('343889', 'POR101', 'Seguradora Especializada', 'Médico-hospitalar', 'Enfermaria', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Porto Seguro Individual Básico'),
('343889', 'POR102', 'Seguradora Especializada', 'Médico-hospitalar', 'Apartamento', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Porto Seguro Individual Premium'),

-- =====================================================
-- ASSIM SAÚDE (Registro ANS: 334537)
-- =====================================================

-- Assim Saúde - Planos Empresariais
('334537', 'ASS001', 'Autogestão', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Assim Saúde Básico'),
('334537', 'ASS002', 'Autogestão', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Assim Saúde Intermediário'),
('334537', 'ASS003', 'Autogestão', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Assim Saúde Premium'),

-- Assim Saúde - Planos Individuais
('334537', 'ASS101', 'Autogestão', 'Médico-hospitalar', 'Enfermaria', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Assim Saúde Individual Básico'),
('334537', 'ASS102', 'Autogestão', 'Médico-hospitalar', 'Apartamento', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Assim Saúde Individual Premium'),

-- =====================================================
-- PLANOS REGIONAIS E ESPECIALIZADOS
-- =====================================================

-- Mediservice (Regional - SP)
('000892', 'MED001', 'Medicina De Grupo', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Estadual', 'Ativa', '2024-01-01', 'Mediservice Básico'),
('000892', 'MED002', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Estadual', 'Ativa', '2024-01-01', 'Mediservice Premium'),

-- São Francisco (Regional - SP)
('000965', 'SAO001', 'Medicina De Grupo', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Estadual', 'Ativa', '2024-01-01', 'São Francisco Básico'),
('000965', 'SAO002', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Estadual', 'Ativa', '2024-01-01', 'São Francisco Premium'),

-- Intermédica (Regional - SP)
('000965', 'INT001', 'Medicina De Grupo', 'Médico-hospitalar', 'Enfermaria', 'Coletivo empresarial', 'Estadual', 'Ativa', '2024-01-01', 'Intermédica Básico'),
('000965', 'INT002', 'Medicina De Grupo', 'Médico-hospitalar', 'Apartamento', 'Coletivo empresarial', 'Estadual', 'Ativa', '2024-01-01', 'Intermédica Premium'),

-- =====================================================
-- PLANOS ODONTOLÓGICOS ESPECIALIZADOS
-- =====================================================

-- Odontoprev
('359076', 'ODO001', 'Odontologia De Grupo', 'Odontológico', 'Não se aplica', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Odontoprev Básico'),
('359076', 'ODO002', 'Odontologia De Grupo', 'Odontológico', 'Não se aplica', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Odontoprev Premium'),
('359076', 'ODO101', 'Odontologia De Grupo', 'Odontológico', 'Não se aplica', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Odontoprev Individual'),

-- Uniodonto
('306002', 'UNO001', 'Cooperativa Odontológica', 'Odontológico', 'Não se aplica', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Uniodonto Básico'),
('306002', 'UNO002', 'Cooperativa Odontológica', 'Odontológico', 'Não se aplica', 'Coletivo empresarial', 'Nacional', 'Ativa', '2024-01-01', 'Uniodonto Premium'),
('306002', 'UNO101', 'Cooperativa Odontológica', 'Odontológico', 'Não se aplica', 'Individual ou familiar', 'Nacional', 'Ativa', '2024-01-01', 'Uniodonto Individual');

-- =====================================================
-- VERIFICAÇÃO E ESTATÍSTICAS
-- =====================================================

-- Verificar total de registros inseridos
SELECT COUNT(*) as total_planos_inseridos FROM health_insurance_plans;

-- Verificar registros por operadora (registro_ans)
SELECT registro_ans, COUNT(*) as quantidade_planos
FROM health_insurance_plans 
GROUP BY registro_ans 
ORDER BY quantidade_planos DESC;

-- Verificar registros por modalidade
SELECT modalidade, COUNT(*) as quantidade 
FROM health_insurance_plans 
GROUP BY modalidade 
ORDER BY quantidade DESC;

-- Verificar registros por tipo de contratação
SELECT tipo_contratacao, COUNT(*) as quantidade 
FROM health_insurance_plans 
GROUP BY tipo_contratacao 
ORDER BY quantidade DESC;

-- Verificar registros por segmentação
SELECT segmentacao, COUNT(*) as quantidade 
FROM health_insurance_plans 
GROUP BY segmentacao 
ORDER BY quantidade DESC;

-- Verificar registros por acomodação
SELECT acomodacao, COUNT(*) as quantidade 
FROM health_insurance_plans 
GROUP BY acomodacao 
ORDER BY quantidade DESC;

-- Verificar registros por abrangência geográfica
SELECT abrangencia_geografica, COUNT(*) as quantidade 
FROM health_insurance_plans 
GROUP BY abrangencia_geografica 
ORDER BY quantidade DESC;

-- Resetar sequência se necessário
SELECT setval('health_insurance_plans_id_seq', (SELECT MAX(id) FROM health_insurance_plans));

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================
SELECT 'PLANOS DE SAÚDE INSERIDOS COM SUCESSO!' as status,
       'Total de ' || COUNT(*) || ' planos de saúde adicionados ao sistema' as resultado
FROM health_insurance_plans
WHERE created_at >= CURRENT_DATE;