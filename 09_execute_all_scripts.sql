-- =====================================================
-- SCRIPT 09: EXECUTE ALL SCRIPTS (EXECUTAR TODOS OS SCRIPTS)
-- =====================================================
-- Descrição: Script mestre para executar todos os scripts na ordem correta
-- Ordem de execução: 9º (script master)

-- INSTRUÇÕES DE USO:
-- 1. Execute os scripts na ordem numerada (01 a 08)
-- 2. Ou execute este script master que chama todos em sequência
-- 3. Verifique os dados após cada execução

-- =====================================================
-- ORDEM DE EXECUÇÃO DOS SCRIPTS
-- =====================================================

-- 1. CONDUTAS CIRÚRGICAS (BASE)
\i 01_surgical_approaches.sql

-- 2. JUSTIFICATIVAS CLÍNICAS (BASE)
\i 02_clinical_justifications.sql

-- 3. ASSOCIAÇÕES CID × CONDUTA (DEPENDE DE: surgical_approaches, cid_codes)
\i 03_cid_surgical_approaches.sql

-- 4. ASSOCIAÇÕES CONDUTA × PROCEDIMENTOS (DEPENDE DE: surgical_approaches, procedures)
\i 04_surgical_approach_procedures.sql

-- 5. ASSOCIAÇÕES CONDUTA × ITENS OPME (DEPENDE DE: surgical_approaches, opme_items)
\i 05_surgical_approach_opme_items.sql

-- 6. ASSOCIAÇÕES CONDUTA × FORNECEDORES (DEPENDE DE: surgical_approaches, suppliers)
\i 06_surgical_approach_suppliers.sql

-- 7. ASSOCIAÇÕES CONDUTA × JUSTIFICATIVAS (DEPENDE DE: surgical_approaches, clinical_justifications)
\i 07_surgical_approach_justifications.sql

-- 8. CIDS EXTRAS AUTOMÁTICOS (DEPENDE DE: cid_codes, surgical_approaches)
\i 08_cid_surgical_approach_extra_cids.sql

-- =====================================================
-- VERIFICAÇÃO FINAL DE DADOS
-- =====================================================

-- Verificar total de registros em cada tabela
SELECT 'surgical_approaches' as tabela, COUNT(*) as registros FROM surgical_approaches
UNION ALL
SELECT 'clinical_justifications', COUNT(*) FROM clinical_justifications
UNION ALL
SELECT 'cid_surgical_approaches', COUNT(*) FROM cid_surgical_approaches
UNION ALL
SELECT 'surgical_approach_procedures', COUNT(*) FROM surgical_approach_procedures
UNION ALL
SELECT 'surgical_approach_opme_items', COUNT(*) FROM surgical_approach_opme_items
UNION ALL
SELECT 'surgical_approach_suppliers', COUNT(*) FROM surgical_approach_suppliers
UNION ALL
SELECT 'surgical_approach_justifications', COUNT(*) FROM surgical_approach_justifications
UNION ALL
SELECT 'cid_surgical_approach_extra_cids', COUNT(*) FROM cid_surgical_approach_extra_cids
ORDER BY tabela;

-- Verificar associações do M75.1 (Síndrome do manguito rotador)
SELECT 
    'M75.1 - Condutas Associadas' as tipo,
    COUNT(*) as quantidade
FROM cid_surgical_approaches csa
JOIN cid_codes cc ON csa.cid_code_id = cc.id
WHERE cc.code = 'M75.1'
UNION ALL
SELECT 
    'M75.1 - CIDs Extras Automáticos',
    COUNT(*)
FROM cid_surgical_approach_extra_cids csaec
JOIN cid_codes cc ON csaec.primary_cid_id = cc.id
WHERE cc.code = 'M75.1';

-- Mensagem final
SELECT 'SCRIPTS EXECUTADOS COM SUCESSO!' as status,
       'Sistema de auto-preenchimento configurado para M75.1' as resultado;