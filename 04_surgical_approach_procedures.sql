-- =====================================================
-- SCRIPT 04: SURGICAL APPROACH × PROCEDURES (CONDUTA-PROCEDIMENTOS CBHPM)
-- =====================================================
-- Tabela: surgical_approach_procedures
-- Descrição: Associações entre condutas cirúrgicas e procedimentos CBHPM
-- Ordem de execução: 4º (após surgical_approaches)
-- Dependências: surgical_approaches, procedures

-- Limpar dados existentes (opcional)
-- DELETE FROM surgical_approach_procedures;

-- Inserir associações Conduta × Procedimento CBHPM
INSERT INTO surgical_approach_procedures (id, surgical_approach_id, procedure_id, is_preferred, complexity, estimated_duration, notes) VALUES
-- Videoartroscopia (surgical_approach_id = 1)
(1, 1, 1, true, 'Porte 2', 45, 'Procedimento diagnóstico básico por videoartroscopia'),
(2, 1, 2, false, 'Porte 4', 120, 'Artrodese de joelho por videoartroscopia - procedimento complexo'),
(3, 1, 3, true, 'Porte 3', 90, 'Artrotomia do joelho por videoartroscopia'),
(4, 1, 4, true, 'Porte 2', 60, 'Biópsia cirúrgica do joelho por videoartroscopia'),
(15, 1, 5, true, 'Média', 90, 'Alopecia parcial - exérese e sutura por videoartroscopia'),
(16, 1, 6, false, 'Baixa', 60, 'Alopecia parcial - rotação de retalho por videoartroscopia'),
(17, 1, 7, false, 'Média', 75, 'Alopecia parcial - rotação múltipla de retalhos por videoartroscopia'),

-- Cirurgia Aberta (surgical_approach_id = 2)
(5, 2, 8, true, 'Porte 5', 180, 'Artroplastia total de joelho com implantes - cirurgia aberta'),
(6, 2, 2, true, 'Porte 4', 150, 'Artrodese de joelho - cirurgia aberta'),
(7, 2, 9, false, 'Porte 5', 120, 'Desarticulação de joelho - cirurgia aberta'),
(8, 2, 10, true, 'Porte 4', 140, 'Fratura e/ou luxação coxo-femoral - cirurgia aberta'),
(18, 2, 11, true, 'Alta', 120, 'Consulta em consultório por cirurgia aberta'),
(19, 2, 12, false, 'Média', 90, 'Consulta em domicílio por cirurgia aberta'),
(20, 2, 13, false, 'Alta', 105, 'Consulta em pronto socorro por cirurgia aberta'),

-- Cirurgia Robótica (surgical_approach_id = 3)
(9, 3, 14, true, 'Porte 5', 200, 'Artroplastia total coxo-femoral robótica'),
(10, 3, 8, false, 'Porte 5', 190, 'Artroplastia total de joelho robótica'),
(21, 3, 15, true, 'Alta', 150, 'Visita hospitalar robótica'),
(22, 3, 16, false, 'Média', 120, 'Visita ou consulta hospitalar robótica');

-- Nota: Os IDs de procedimentos são baseados nos dados existentes
-- Procedure IDs correspondem aos registros na tabela procedures

-- Resetar sequência (se necessário)
SELECT setval('surgical_approach_procedures_id_seq', (SELECT MAX(id) FROM surgical_approach_procedures));

-- Verificar dados inseridos
SELECT COUNT(*) as total_associacoes FROM surgical_approach_procedures;

-- Verificar associações criadas
SELECT 
    sap.id,
    sa.name as surgical_approach,
    p.code as procedure_code,
    p.name as procedure_name,
    sap.is_preferred,
    sap.complexity,
    sap.estimated_duration,
    sap.notes
FROM surgical_approach_procedures sap
JOIN surgical_approaches sa ON sap.surgical_approach_id = sa.id
JOIN procedures p ON sap.procedure_id = p.id
ORDER BY sap.id;