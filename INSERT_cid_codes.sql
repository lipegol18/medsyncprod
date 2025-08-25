-- =====================================================
-- SQL INSERT PARA TABELA CID_CODES
-- =====================================================
-- Tabela: cid_codes
-- Descrição: Códigos CID-10 para sistema médico MedSync
-- Foco: Ortopedia e Traumatologia (especialmente ombro)
-- Data: 14/07/2025

-- Estrutura da tabela:
-- id (integer, auto-increment)
-- code (text, NOT NULL)
-- description (text, NOT NULL)
-- category (cid_categories enum, NOT NULL)
-- created_at (timestamp, auto)
-- updated_at (timestamp, auto)

-- =====================================================
-- ORTOPEDIA E TRAUMATOLOGIA - OMBRO
-- =====================================================

INSERT INTO cid_codes (code, description, category) VALUES
-- Síndrome do Manguito Rotador
('M75.1', 'Síndrome do manguito rotador', 'Ombro'),
('M75.2', 'Tendinite bicipital', 'Ombro'),
('M75.3', 'Tendinite calcária do ombro', 'Ombro'),
('M75.4', 'Síndrome de impacto do ombro', 'Ombro'),
('M75.5', 'Bursite do ombro', 'Ombro'),
('M75.8', 'Outras lesões do ombro', 'Ombro'),
('M75.9', 'Lesão do ombro, não especificada', 'Ombro'),

-- Instabilidade do Ombro
('M24.4', 'Instabilidade articular', 'Ombro'),
('S43.0', 'Luxação da articulação do ombro', 'Lesões e Envenenamentos'),
('S43.1', 'Luxação da articulação acromioclavicular', 'Lesões e Envenenamentos'),
('S43.2', 'Luxação da articulação esternoclavicular', 'Lesões e Envenenamentos'),

-- Fraturas do Ombro
('S42.0', 'Fratura da clavícula', 'Lesões e Envenenamentos'),
('S42.1', 'Fratura da escápula', 'Lesões e Envenenamentos'),
('S42.2', 'Fratura da extremidade superior do úmero', 'Lesões e Envenenamentos'),
('S42.3', 'Fratura da diáfise do úmero', 'Lesões e Envenenamentos'),

-- Lesões de Tendões e Ligamentos
('S46.0', 'Traumatismo de tendão do manguito rotador do ombro', 'Lesões e Envenenamentos'),
('S46.1', 'Traumatismo de músculo e tendão da cabeça longa do bíceps', 'Lesões e Envenenamentos'),
('S46.2', 'Traumatismo de músculo e tendão de outras partes do bíceps', 'Lesões e Envenenamentos'),
('S46.3', 'Traumatismo de músculo e tendão do tríceps', 'Lesões e Envenenamentos'),

-- =====================================================
-- ORTOPEDIA E TRAUMATOLOGIA - JOELHO
-- =====================================================

-- Gonartrose
('M17.0', 'Gonartrose bilateral primária', 'Joelho'),
('M17.1', 'Gonartrose unilateral primária', 'Joelho'),
('M17.2', 'Gonartrose bilateral pós-traumática', 'Joelho'),
('M17.3', 'Gonartrose unilateral pós-traumática', 'Joelho'),
('M17.4', 'Outras gonartroses bilaterais secundárias', 'Joelho'),
('M17.5', 'Outras gonartroses unilaterais secundárias', 'Joelho'),
('M17.9', 'Gonartrose, não especificada', 'Joelho'),

-- Lesões Meniscais
('M23.0', 'Menisco cístico', 'Joelho'),
('M23.1', 'Menisco discóide', 'Joelho'),
('M23.2', 'Transtorno do menisco devido à ruptura ou lesão antiga', 'Joelho'),
('M23.3', 'Outros transtornos do menisco', 'Joelho'),
('S83.0', 'Luxação da rótula', 'Lesões e Envenenamentos'),
('S83.2', 'Ruptura do menisco, atual', 'Lesões e Envenenamentos'),

-- Lesões Ligamentares
('S83.5', 'Entorse e distensão do ligamento cruzado do joelho', 'Lesões e Envenenamentos'),
('S83.6', 'Entorse e distensão de outras partes do joelho', 'Lesões e Envenenamentos'),
('M23.5', 'Instabilidade crônica do joelho', 'Joelho'),

-- Fraturas do Joelho
('S82.0', 'Fratura da rótula', 'Lesões e Envenenamentos'),
('S82.1', 'Fratura da extremidade superior da tíbia', 'Lesões e Envenenamentos'),
('S82.2', 'Fratura da diáfise da tíbia', 'Lesões e Envenenamentos'),

-- =====================================================
-- ORTOPEDIA E TRAUMATOLOGIA - COLUNA
-- =====================================================

-- Hérnia de Disco
('M51.0', 'Transtornos de discos lombares e outros com mielopatia', 'Coluna'),
('M51.1', 'Transtornos de discos lombares e outros com radiculopatia', 'Coluna'),
('M51.2', 'Outros deslocamentos de disco intervertebral especificados', 'Coluna'),
('M51.3', 'Outras degenerações de disco intervertebral especificadas', 'Coluna'),
('M51.4', 'Nódulos de Schmorl', 'Coluna'),
('M51.8', 'Outros transtornos especificados de discos intervertebrais', 'Coluna'),
('M51.9', 'Transtorno de disco intervertebral, não especificado', 'Coluna'),

-- Estenose Espinhal
('M48.0', 'Estenose espinhal', 'Coluna'),
('M48.1', 'Espondilolistese', 'Coluna'),
('M48.2', 'Síndrome da cauda equina', 'Coluna'),

-- Fraturas da Coluna
('S32.0', 'Fratura de vértebra lombar', 'Lesões e Envenenamentos'),
('S22.0', 'Fratura de vértebra torácica', 'Lesões e Envenenamentos'),
('S12.0', 'Fratura de vértebra cervical', 'Lesões e Envenenamentos'),

-- =====================================================
-- ORTOPEDIA E TRAUMATOLOGIA - QUADRIL
-- =====================================================

-- Coxartrose
('M16.0', 'Coxartrose bilateral primária', 'Quadril'),
('M16.1', 'Coxartrose unilateral primária', 'Quadril'),
('M16.2', 'Coxartrose bilateral resultante de displasia', 'Quadril'),
('M16.3', 'Coxartrose unilateral resultante de displasia', 'Quadril'),
('M16.4', 'Coxartrose bilateral pós-traumática', 'Quadril'),
('M16.5', 'Coxartrose unilateral pós-traumática', 'Quadril'),
('M16.9', 'Coxartrose, não especificada', 'Quadril'),

-- Necrose Avascular
('M87.0', 'Necrose avascular idiopática do osso', 'Quadril'),
('M87.1', 'Necrose avascular do osso devido a drogas', 'Quadril'),
('M87.2', 'Necrose avascular do osso devido a traumatismo prévio', 'Quadril'),

-- Fraturas do Quadril
('S72.0', 'Fratura do colo do fêmur', 'Lesões e Envenenamentos'),
('S72.1', 'Fratura pertrocantérica', 'Lesões e Envenenamentos'),
('S72.2', 'Fratura subtrocantérica do fêmur', 'Lesões e Envenenamentos'),

-- =====================================================
-- ORTOPEDIA E TRAUMATOLOGIA - PÉ E TORNOZELO
-- =====================================================

-- Fraturas do Tornozelo
('S82.3', 'Fratura da extremidade inferior da tíbia', 'Lesões e Envenenamentos'),
('S82.4', 'Fratura da fíbula isolada', 'Lesões e Envenenamentos'),
('S82.5', 'Fratura do maléolo medial', 'Lesões e Envenenamentos'),
('S82.6', 'Fratura do maléolo lateral', 'Lesões e Envenenamentos'),

-- Lesões Ligamentares
('S93.0', 'Luxação da articulação do tornozelo', 'Lesões e Envenenamentos'),
('S93.4', 'Entorse e distensão do tornozelo', 'Lesões e Envenenamentos'),

-- Patologias do Pé
('M77.3', 'Esporão do calcâneo', 'Pé e tornozelo'),
('M72.2', 'Fibromatose plantar', 'Pé e tornozelo'),
('M20.1', 'Hallux valgus', 'Pé e tornozelo'),
('M20.2', 'Hallux rigidus', 'Pé e tornozelo'),

-- =====================================================
-- OUTRAS ESPECIALIDADES MÉDICAS
-- =====================================================

-- Cardiologia
('I25.1', 'Doença aterosclerótica do coração', 'Doenças do Aparelho Circulatório'),
('I21.9', 'Infarto agudo do miocárdio, não especificado', 'Doenças do Aparelho Circulatório'),
('I50.9', 'Insuficiência cardíaca, não especificada', 'Doenças do Aparelho Circulatório'),

-- Oftalmologia
('H25.9', 'Catarata senil, não especificada', 'Doenças do Olho e Anexos'),
('H40.9', 'Glaucoma, não especificado', 'Doenças do Olho e Anexos'),
('H33.0', 'Descolamento da retina com defeito retiniano', 'Doenças do Olho e Anexos'),

-- Urologia
('N40', 'Hiperplasia da próstata', 'Doenças do Aparelho Geniturinário'),
('N20.0', 'Cálculo do rim', 'Doenças do Aparelho Geniturinário'),
('N20.1', 'Cálculo do ureter', 'Doenças do Aparelho Geniturinário'),

-- Cirurgia Geral
('K80.2', 'Cálculo da vesícula biliar sem colecistite', 'Doenças do Aparelho Digestivo'),
('K35.9', 'Apendicite aguda, não especificada', 'Doenças do Aparelho Digestivo'),
('K42.9', 'Hérnia umbilical sem obstrução ou gangrena', 'Doenças do Aparelho Digestivo');

-- =====================================================
-- VERIFICAÇÃO E ESTATÍSTICAS
-- =====================================================

-- Verificar total de registros inseridos
SELECT COUNT(*) as total_cids_inseridos FROM cid_codes;

-- Verificar registros por categoria
SELECT category, COUNT(*) as quantidade 
FROM cid_codes 
GROUP BY category 
ORDER BY quantidade DESC;

-- Verificar se M75.1 foi inserido corretamente
SELECT * FROM cid_codes WHERE code = 'M75.1';

-- Verificar se S46.0 foi inserido corretamente
SELECT * FROM cid_codes WHERE code = 'S46.0';

-- Resetar sequência se necessário
SELECT setval('cid_codes_id_seq', (SELECT MAX(id) FROM cid_codes));

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================
SELECT 'CID CODES INSERIDOS COM SUCESSO!' as status,
       'Total de ' || COUNT(*) || ' códigos CID-10 adicionados ao sistema' as resultado
FROM cid_codes;