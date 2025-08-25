-- =====================================================
-- SCRIPT 07: SURGICAL APPROACH × JUSTIFICATIONS (CONDUTA-JUSTIFICATIVAS)
-- =====================================================
-- Tabela: surgical_approach_justifications
-- Descrição: Associações entre condutas cirúrgicas e justificativas clínicas
-- Ordem de execução: 7º (após surgical_approaches e clinical_justifications)
-- Dependências: surgical_approaches, clinical_justifications

-- Limpar dados existentes (opcional)
-- DELETE FROM surgical_approach_justifications;

-- Inserir associações Conduta × Justificativa Clínica
INSERT INTO surgical_approach_justifications (id, surgical_approach_id, justification_id, is_preferred, custom_notes) VALUES
-- Videoartroscopia (surgical_approach_id = 1)
(1, 1, 12, true, 'Justificativa padrão para artroscopia de joelho por videoartroscopia - lesão meniscal'),
(2, 1, 14, false, 'Justificativa para artroscopia de ombro adaptada para procedimento de joelho'),

-- Cirurgia Aberta (surgical_approach_id = 2)
(3, 2, 13, true, 'Justificativa principal para artroplastia total de joelho por cirurgia aberta'),
(4, 2, 16, false, 'Justificativa para osteossíntese de fêmur por acesso aberto'),
(5, 2, 15, false, 'Justificativa para reparo de manguito rotador por cirurgia aberta'),
(12, 2, 23, false, 'Cirurgia aberta em contexto de emergência - adaptação para trauma ortopédico'),

-- Cirurgia Robótica (surgical_approach_id = 3)
(6, 3, 13, true, 'Artroplastia total de joelho com precisão robótica para melhor alinhamento'),
(7, 3, 15, false, 'Reparo de manguito rotador assistido por robô para maior precisão'),
(13, 3, 18, false, 'Cirurgia robótica cardiovascular adaptada para procedimentos ortopédicos complexos');

-- Nota: Os IDs de justificativas são baseados nos dados existentes
-- Justification IDs correspondem aos registros na tabela clinical_justifications
-- is_preferred: true para justificativa principal de cada conduta
-- custom_notes: adaptações específicas da justificativa para cada conduta

-- Resetar sequência (se necessário)
SELECT setval('surgical_approach_justifications_id_seq', (SELECT MAX(id) FROM surgical_approach_justifications));

-- Verificar dados inseridos
SELECT COUNT(*) as total_associacoes FROM surgical_approach_justifications;

-- Verificar associações criadas
SELECT 
    saj.id,
    sa.name as surgical_approach,
    cj.title as justification_title,
    saj.is_preferred,
    saj.custom_notes
FROM surgical_approach_justifications saj
JOIN surgical_approaches sa ON saj.surgical_approach_id = sa.id
JOIN clinical_justifications cj ON saj.justification_id = cj.id
ORDER BY saj.id;