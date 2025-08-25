-- =====================================================
-- SCRIPT 02: CLINICAL JUSTIFICATIONS (JUSTIFICATIVAS CLÍNICAS)
-- =====================================================
-- Tabela: clinical_justifications
-- Descrição: Justificativas clínicas pré-definidas para procedimentos médicos
-- Ordem de execução: 2º

-- Limpar dados existentes (opcional)
-- DELETE FROM clinical_justifications;

-- Inserir justificativas clínicas
INSERT INTO clinical_justifications (id, title, content, category, specialty, procedure_type, is_active, created_by) VALUES
(12, 'Artroscopia de Joelho - Lesão Meniscal', 'Paciente apresenta dor persistente em joelho direito/esquerdo, com limitação funcional significativa. Exames de imagem (RM) evidenciam lesão meniscal complexa não responsiva ao tratamento conservador. Indicada artroscopia para meniscectomia parcial/reparo meniscal visando alívio da sintomatologia dolorosa e recuperação da função articular.', 'Ortopedia', 'Ortopedia e Traumatologia', 'Cirúrgico', true, 65),
(13, 'Artroplastia Total de Joelho - Gonartrose', 'Paciente portador de gonartrose severa (grau IV de Kellgren-Lawrence), com dor incapacitante e limitação funcional importante que compromete significativamente as atividades de vida diária. Falha do tratamento conservador com analgésicos, anti-inflamatórios, fisioterapia e infiltrações. Indicada artroplastia total de joelho para alívio da dor e restauração da função.', 'Ortopedia', 'Ortopedia e Traumatologia', 'Cirúrgico', true, 65),
(14, 'Artroscopia de Ombro - Síndrome do Impacto', 'Paciente com síndrome do impacto subacromial refratária ao tratamento conservador, apresentando dor e limitação funcional do ombro. RM evidencia sinais de impacto com tendinopatia do manguito rotador. Indicada artroscopia para acromioplastia e desbridamento, visando descompressão do espaço subacromial.', 'Ortopedia', 'Ortopedia e Traumatologia', 'Cirúrgico', true, 65),
(15, 'Reparo de Lesão do Manguito Rotador', 'Paciente apresenta ruptura completa do tendão supraespinal confirmada por RM, com dor noturna e limitação funcional do ombro. Falha do tratamento conservador por 6 meses. Indicado reparo artroscópico do manguito rotador para restauração da integridade anatômica e função.', 'Ortopedia', 'Ortopedia e Traumatologia', 'Cirúrgico', true, 65),
(16, 'Osteossíntese de Fratura de Fêmur', 'Paciente vítima de trauma de alta energia com fratura diafisária de fêmur confirmada radiologicamente. Fratura instável com desvio e encurtamento, necessitando de redução e fixação cirúrgica para adequada consolidação óssea e recuperação funcional.', 'Ortopedia', 'Ortopedia e Traumatologia', 'Cirúrgico', true, 65),
(17, 'Cateterismo Cardíaco Diagnóstico', 'Paciente com dor torácica típica e teste ergométrico positivo para isquemia miocárdica. Ecocardiograma demonstra alterações segmentares da contratilidade. Indicado cateterismo cardíaco diagnóstico para avaliação da anatomia coronariana e definição da estratégia terapêutica mais adequada.', 'Cardiologia', 'Cardiologia', 'Diagnóstico', true, 33),
(18, 'Angioplastia Coronariana com Stent', 'Paciente com síndrome coronariana aguda, apresentando lesão crítica (>70%) em artéria descendente anterior proximal ao cateterismo. Indicada angioplastia coronariana com implante de stent farmacológico para revascularização miocárdica e prevenção de eventos cardiovasculares maiores.', 'Cardiologia', 'Cardiologia Intervencionista', 'Cirúrgico', true, 33),
(19, 'Facoemulsificação com Implante de LIO', 'Paciente portador de catarata senil madura com significativa diminuição da acuidade visual (AV < 20/40), interferindo nas atividades de vida diária. Indicada facoemulsificação com implante de lente intraocular para restauração da função visual.', 'Oftalmologia', 'Oftalmologia', 'Cirúrgico', true, 42),
(20, 'Vitrectomia por Descolamento de Retina', 'Paciente apresenta descolamento de retina regmatógeno confirmado por biomicroscopia e ultrassom ocular. Quadro com risco de perda visual permanente. Indicada vitrectomia via pars plana com tamponamento interno para reaplicação retiniana e preservação da função visual.', 'Oftalmologia', 'Retina e Vítreo', 'Cirúrgico', true, 42),
(21, 'RTU de Próstata', 'Paciente portador de hiperplasia prostática benigna com sintomas obstrutivos severos (IPSS > 20), retenção urinária de repetição e falha do tratamento medicamentoso. Indicada ressecção transuretral da próstata para alívio da obstrução e melhora dos sintomas.', 'Urologia', 'Urologia', 'Cirúrgico', true, 79),
(22, 'Nefrolitotripsia Percutânea', 'Paciente portador de cálculo renal coraliforme em rim direito/esquerdo, com mais de 2cm de diâmetro, associado a infecções urinárias de repetição e deterioração da função renal. Indicada nefrolitotripsia percutânea para remoção completa do cálculo.', 'Urologia', 'Urologia', 'Cirúrgico', true, 79),
(23, 'Cirurgia de Emergência - Abdome Agudo', 'Paciente apresenta quadro de abdome agudo com sinais de peritonite difusa e instabilidade hemodinâmica. TC de abdome evidencia perfuração de víscera oca. Indicada laparotomia exploradora de urgência para controle do foco séptico e estabilização do quadro.', 'Cirurgia Geral', 'Cirurgia Geral', 'Cirúrgico', true, 63),
(24, 'Colecistectomia Laparoscópica', 'Paciente com colelitíase sintomática e episódios recorrentes de colangite aguda. USG de abdome confirma múltiplos cálculos em vesícula biliar com sinais inflamatórios. Indicada colecistectomia laparoscópica para tratamento definitivo e prevenção de complicações.', 'Cirurgia Geral', 'Cirurgia Geral', 'Cirúrgico', true, 63);

-- Resetar sequência (se necessário)
SELECT setval('clinical_justifications_id_seq', (SELECT MAX(id) FROM clinical_justifications));

-- Verificar dados inseridos
SELECT COUNT(*) as total_justificativas FROM clinical_justifications;