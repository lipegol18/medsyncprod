-- Script de importação de justificativas clínicas
-- Data: 26/07/2025
-- Total de justificativas: 27

BEGIN;

-- Justificativa 1: Luxação Acrômio-Clavicular
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Luxação Acrômio-Clavicular',
    'Paciente com dor intensa e limitação funcional no ombro, com piora progressiva após trauma há cerca de 30 dias. Relata dor à movimentação ativa, especialmente acima de 90 graus, e dor noturna que interfere no sono. Foi acompanhado com fisioterapia e analgesia, sem melhora clínica. Ao exame físico, apresenta limitação do arco de movimento, Teste de Jobe positivo para dor e perda de força, Bear Hug test positivo, e dor à rotação externa contra resistência. Há também sensibilidade à palpação do acrômio e da articulação acromioclavicular, além de sinal de desabamento. Ressonância magnética demonstra ruptura das fibras do tendão supraespinhoso e da porção anterior do tendão infraespinhoso, além de bursite, sinovite e artrose acromioclavicular com osteólise da clavícula distal. Diante da dor refratária, perda funcional e falha do tratamento conservador, solicito internação para tratamento cirúrgico por via artroscópica com reinserção tendínea. Conforme Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), casos com ruptura completa e sintomas incapacitantes após 4 a 6 semanas de falha conservadora devem ser tratados cirurgicamente para evitar retração tendínea e atrofia muscular irreversíveis.',
    'Luxação Acrômio-Clavicular',
    'Ortopedia e Traumatologia',
    'LAC',
    true
);

-- Justificativa 2: Reparo do Manguito Rotador - Artroscopia
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Reparo do Manguito Rotador - Artroscopia',
    'Paciente com dor intensa e limitação funcional no ombro, com piora progressiva após trauma há cerca de 30 dias. Relata dor à movimentação ativa, especialmente acima de 90 graus, e dor noturna que interfere no sono. Foi acompanhado com fisioterapia e analgesia, sem melhora clínica. Ao exame físico, apresenta limitação do arco de movimento, Teste de Jobe positivo para dor e perda de força, Bear Hug test positivo, e dor à rotação externa contra resistência. Há também sensibilidade à palpação do acrômio e da articulação acromioclavicular, além de sinal de desabamento. Ressonância magnética demonstra ruptura das fibras do tendão supraespinhoso e da porção anterior do tendão infraespinhoso, além de bursite, sinovite e artrose acromioclavicular com osteólise da clavícula distal. Diante da dor refratária, perda funcional e falha do tratamento conservador, solicito internação para tratamento cirúrgico por via artroscópica com reinserção tendínea. Conforme Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), casos com ruptura completa e sintomas incapacitantes após 4 a 6 semanas de falha conservadora devem ser tratados cirurgicamente para evitar retração tendínea e atrofia muscular irreversíveis. Paciente apresenta dor intensa e limitação funcional no ombro, com piora progressiva nas últimas semanas. Refere dor à elevação do braço e durante esforços, além de dor noturna que compromete o sono e interfere nas atividades laborais e da vida diária. Foi submetido a tratamento conservador com analgesia, anti-inflamatórios e fisioterapia motora, sem melhora clínica satisfatória. Ao exame físico, observa-se limitação do arco de movimento ativo, dor à elevação, rotação interna e externa contra resistência. Testes específicos como Jobe e Bear Hug são positivos para dor. Ressonância magnética do ombro evidencia ruptura parcial do tendão supraespinhoso, associada a bursite subacromial e sinovite articular, sem indicação cirúrgica imediata. Diante da persistência dos sintomas, prejuízo funcional e falha do tratamento conservador, solicito autorização para realização de infiltração intra-articular do ombro com anestésico e corticosteroide, associada a bloqueio dos ramos sensitivos dos nervos supraescapular, axilar e peitoral lateral, com o objetivo de alívio da dor e melhora da função articular. Paciente jovem, com histórico de luxação traumática do ombro, evoluindo com episódios recorrentes de instabilidade glenoumeral. Refere episódios de luxação com movimentos em abdução e rotação externa, sensação de falseio e insegurança no ombro acometido. Ao exame físico, apresenta sinal do ressalto positivo, teste de apreensão anterior positivo e relutância à mobilização ativa em abdução e rotação externa. Exames de imagem (ressonância magnética e tomografia computadorizada) confirmam lesão labral anterior (Bankart) e lesão de Hill-Sachs on-track, com perda óssea glenoidal < 15%, sem comprometimento da estabilidade óssea crítica. Diante do quadro de instabilidade pós-traumática recidivante, sem perda óssea crítica e com lesão on-track, solicito internação hospitalar para tratamento cirúrgico com reparo artroscópico do lábio anterior da glenoide, associado a capsuloplastia anterior. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.) e Di Giacomo et al., o reparo artroscópico labral é indicado em casos de instabilidade com integridade óssea preservada e lesão on-track, oferecendo excelentes resultados funcionais em pacientes jovens e ativos. Paciente jovem, com histórico de luxação traumática do ombro, evoluindo com episódios recorrentes de instabilidade glenoumeral. Refere episódios frequentes de luxação em mínimos graus de movimento, sensação constante de falseio e perda de confiança no ombro acometido. Ao exame físico, apresenta teste de apreensão anterior positivo, relutância à rotação externa e sinal do ressalto evidente. Exames de imagem (tomografia e ressonância magnética) demonstram lesão de Hill-Sachs off-track, associada a perda óssea glenoidal > 15%, lesão labral anterior (Bankart), e edema periarticular compatível com instabilidade estrutural crônica. Diante da instabilidade recidivante, da lesão óssea crítica e da falha do controle articular com tratamento conservador, solicito internação hospitalar para realização de tratamento cirúrgico pela técnica de Bristow-Latarjet. O procedimento incluirá: · Osteotomia do processo coracoide com transferência e fixação na borda anterior da glenoide com parafusos metálicos, visando restaurar o efeito de contenção óssea e suporte ligamentar; · Transferência do tendão conjunto (coracobraquial + cabeça curta do bíceps), atuando como reforço dinâmico da estabilidade anterior; · Reparo do subescapular com split muscular controlado, para permitir acesso à glenoide com preservação funcional; · Tratamento da lesão labral associada (Bankart), com reinserção da cápsula anterior; · Microneurólise dos ramos do nervo axilar e musculocutâneo, com o objetivo de reduzir o risco de compressão neuropática; · Tenodese da cabeça longa do bíceps, quando identificada instabilidade, luxação intra-articular ou degeneração tendínea. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.) e Walch et al., a técnica de Bristow-Latarjet está indicada em casos de instabilidade anterior do ombro com perda óssea glenoidal significativa e lesões off-track, oferecendo contenção óssea, reforço ligamentar e bloqueio dinâmico eficaz. A associação de procedimentos complementares visa o controle completo da instabilidade e da dor crônica. Paciente vítima de trauma de alta energia sobre o ombro, evoluindo com dor intensa, hematoma, deformidade evidente e impotência funcional do membro superior acometido. Ao exame físico, observa-se deformidade acentuada na região da articulação acromioclavicular, com desvio visível e proeminência da extremidade distal da clavícula, dor intensa à palpação, mobilidade anormal da clavícula distal (sinal da tecla), limitação da mobilidade ativa e hematoma em face superior do ombro. Radiografias evidenciam luxação acromioclavicular com deslocamento completo da clavícula distal em relação ao acrômio, compatível com LAC grau III/IV segundo a classificação de Rockwood. Diante do grau elevado de instabilidade, da limitação funcional importante, da deformidade persistente e do risco de evolução para artrose acromioclavicular e disfunção crônica da cintura escapular, solicito internação hospitalar para tratamento cirúrgico com reconstrução da articulação acromioclavicular e dos ligamentos coracoclaviculares. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), luxações acromioclaviculares de grau III a VI sintomáticas ou instáveis após trauma de alta energia são indicações formais de reconstrução cirúrgica, visando restauração anatômica, estabilidade da cintura escapular e retorno funcional. Paciente com dor crônica e progressiva no ombro, com limitação funcional importante, especialmente para elevação e rotação do membro superior. Refere piora dos sintomas nos últimos meses, com prejuízo para atividades básicas e laborais, além de dor noturna recorrente. Realizou tratamento conservador com analgesia e fisioterapia, sem melhora clínica significativa. Ao exame físico, apresenta mobilidade ativa severamente limitada, com Testes de Jobe e Patte não testáveis por impotência funcional. Presença de sinal de desabamento e perda global de força à movimentação ativa. Ressonância magnética evidencia ruptura crônica e irreparável dos tendões do supraespinhoso e infraespinhoso, com retração grau 3 de Patte e degeneração gordurosa grau 3 de Goutallier, além de elevação da cabeça umeral e sinais de artropatia do manguito. Diante da irreparabilidade tendínea, da falha do tratamento conservador e da limitação funcional grave, solicito internação hospitalar para realização de artroplastia reversa do ombro. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), a artroplastia reversa está indicada em pacientes com ruptura crônica do manguito rotador, com artropatia associada, retração e degeneração muscular, especialmente nos casos com pseudoparalisia funcional. Favard et al. também reforçam que a reversa proporciona alívio da dor e melhora funcional em pacientes com artropatia do manguito e comprometimento da mobilidade ativa. Paciente vítima de trauma em membro superior, evoluindo com dor intensa, impotência funcional e deformidade no ombro. Ao exame físico, apresenta edema importante, limitação completa da mobilidade ativa e dor à palpação em região de ombro e colo do úmero. Exame de imagem (radiografia e tomografia) evidencia fratura cominutiva do úmero proximal, classificada como fratura em 4 partes segundo Neer, com desvio, separação dos fragmentos tuberositários e risco de necrose avascular da cabeça umeral. Dada a complexidade da fratura, a cominuição dos fragmentos, a perda de alinhamento anatômico e o alto risco de falha na fixação interna, especialmente em pacientes com baixa densidade óssea, solicito internação hospitalar para realização de artroplastia reversa do ombro como tratamento definitivo. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas em 3 ou 4 partes, especialmente em pacientes idosos ou com osso osteoporótico, representam indicação formal para artroplastia reversa, considerando os altos índices de complicações e falhas mecânicas com o uso de osteossíntese convencional. Boileau et al. também reforçam a superioridade da reversa em fraturas cominutivas complexas, com melhor resultado funcional e menor taxa de revisão cirúrgica. Paciente com histórico de fratura prévia do úmero proximal, submetido anteriormente a osteossíntese, evoluindo com dor crônica no ombro, limitação funcional progressiva e sinais clínicos de falha da fixação. Relata piora dos sintomas nos últimos meses, com dor contínua, perda de mobilidade ativa e dificuldade para realizar atividades básicas. Ao exame físico, observa-se limitação global da amplitude de movimento, dor à mobilização passiva e ativa, sinal de desabamento, crepitação e impotência funcional à elevação do membro superior. Radiografias e tomografia evidenciam falha da osteossíntese com soltura do material, colapso em varo da cabeça umeral, pseudoartrose e elevação da cabeça umeral em relação à glenoide. Os achados são compatíveis com sequela pós-fratura com artropatia do manguito. Diante da falha do tratamento prévio, da dor persistente e da limitação funcional severa, solicito internação hospitalar para realização de revisão cirúrgica com artroplastia reversa do ombro. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), pacientes com falha de síntese do úmero proximal, necrose da cabeça e comprometimento do manguito rotador têm indicação formal de artroplastia reversa como procedimento de revisão, com melhores taxas de controle da dor e recuperação funcional em comparação à reosteossíntese. Paciente vítima de trauma em alta energia, evoluindo com dor intensa, edema e limitação funcional importante do ombro acometido, incapacidade para movimentação ativa e dor à palpação profunda da escápula e região posterior do ombro. Ao exame físico, apresenta limitação acentuada da mobilidade ativa e passiva, dor à movimentação do ombro e crepitação. Palpação dolorosa na borda lateral da escápula. Exames de imagem (radiografias e tomografia computadorizada) evidenciam fratura da escápula com acometimento da superfície articular da glenóide (classificação de Ideberg tipo III), com deslocamento articular significativo, instabilidade e risco de incongruência da articulação glenoumeral. Diante do deslocamento articular, incongruência da superfície da glenóide e risco de evolução para artrose secundária e limitação funcional permanente, solicito internação hospitalar para realização de tratamento cirúrgico com redução aberta e fixação interna da fratura intra-articular da escápula. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas articulares deslocadas da escápula, especialmente com comprometimento da cavidade glenoidal e instabilidade articular, são indicação formal de tratamento operatório, com o objetivo de restaurar a congruência articular e preservar a função do ombro. Paciente vítima de trauma direto sobre o ombro, evoluindo com dor intensa, edema local e deformidade visível em topografia de clavícula. Refere limitação funcional importante e dor à movimentação do ombro. Ao exame físico, observa-se deformidade evidente na face anterior do ombro, palpação dolorosa e mobilidade anormal no trajeto da clavícula. Mobilidade ativa do ombro limitada pela dor. Radiografias demonstram fratura da diáfise clavicular com desvio significativo dos fragmentos e encurtamento do eixo clavicular. Os achados são compatíveis com fratura instável, com risco de consolidação viciosa e limitação funcional futura. Diante do padrão instável da fratura, do desvio com encurtamento e da perda do alinhamento anatômico, solicito internação hospitalar para realização de tratamento cirúrgico com redução aberta e fixação interna da clavícula. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas desviadas e instáveis da diáfise da clavícula, especialmente com encurtamento > 2 cm, sobreposição dos fragmentos ou risco de pseudartrose, são indicações formais de tratamento cirúrgico. Paciente vítima de trauma direto em ombro, evoluindo com dor intensa e limitação funcional importante, associadas a edema e sensibilidade à palpação profunda na região ântero-superior do ombro.',
    'Reparo do Manguito Rotador',
    'Ortopedia e Traumatologia',
    'Artroscopia',
    true
);

-- Justificativa 3: Infiltração e Bloqueio do Ombro
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Infiltração e Bloqueio do Ombro',
    'Paciente apresenta dor intensa e limitação funcional no ombro, com piora progressiva nas últimas semanas. Refere dor à elevação do braço e durante esforços, além de dor noturna que compromete o sono e interfere nas atividades laborais e da vida diária. Foi submetido a tratamento conservador com analgesia, anti-inflamatórios e fisioterapia motora, sem melhora clínica satisfatória. Ao exame físico, observa-se limitação do arco de movimento ativo, dor à elevação, rotação interna e externa contra resistência. Testes específicos como Jobe e Bear Hug são positivos para dor. Ressonância magnética do ombro evidencia ruptura parcial do tendão supraespinhoso, associada a bursite subacromial e sinovite articular, sem indicação cirúrgica imediata. Diante da persistência dos sintomas, prejuízo funcional e falha do tratamento conservador, solicito autorização para realização de infiltração intra-articular do ombro com anestésico e corticosteroide, associada a bloqueio dos ramos sensitivos dos nervos supraescapular, axilar e peitoral lateral, com o objetivo de alívio da dor e melhora da função articular.',
    'Infiltração e Bloqueio',
    'Ortopedia e Traumatologia',
    'Bloqueio - Guiado por USG',
    true
);

-- Justificativa 4: Procedimento Ortopédico Geral
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Procedimento Ortopédico Geral',
    'Paciente jovem, com histórico de luxação traumática do ombro, evoluindo com episódios recorrentes de instabilidade glenoumeral. Refere episódios de luxação com movimentos em abdução e rotação externa, sensação de falseio e insegurança no ombro acometido. Ao exame físico, apresenta sinal do ressalto positivo, teste de apreensão anterior positivo e relutância à mobilização ativa em abdução e rotação externa. Exames de imagem (ressonância magnética e tomografia computadorizada) confirmam lesão labral anterior (Bankart) e lesão de Hill-Sachs on-track, com perda óssea glenoidal < 15%, sem comprometimento da estabilidade óssea crítica. Diante do quadro de instabilidade pós-traumática recidivante, sem perda óssea crítica e com lesão on-track, solicito internação hospitalar para tratamento cirúrgico com reparo artroscópico do lábio anterior da glenoide, associado a capsuloplastia anterior. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.) e Di Giacomo et al., o reparo artroscópico labral é indicado em casos de instabilidade com integridade óssea preservada e lesão on-track, oferecendo excelentes resultados funcionais em pacientes jovens e ativos.',
    'Procedimento Ortopédico',
    'Ortopedia e Traumatologia',
    'Cirurgia Aberta',
    true
);

-- Justificativa 5: Luxação Glenoumeral - Latarjet
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Luxação Glenoumeral - Latarjet',
    'Paciente jovem, com histórico de luxação traumática do ombro, evoluindo com episódios recorrentes de instabilidade glenoumeral. Refere episódios frequentes de luxação em mínimos graus de movimento, sensação constante de falseio e perda de confiança no ombro acometido. Ao exame físico, apresenta teste de apreensão anterior positivo, relutância à rotação externa e sinal do ressalto evidente. Exames de imagem (tomografia e ressonância magnética) demonstram lesão de Hill-Sachs off-track, associada a perda óssea glenoidal > 15%, lesão labral anterior (Bankart), e edema periarticular compatível com instabilidade estrutural crônica. Diante da instabilidade recidivante, da lesão óssea crítica e da falha do controle articular com tratamento conservador, solicito internação hospitalar para realização de tratamento cirúrgico pela técnica de Bristow-Latarjet. O procedimento incluirá: · Osteotomia do processo coracoide com transferência e fixação na borda anterior da glenoide com parafusos metálicos, visando restaurar o efeito de contenção óssea e suporte ligamentar; · Transferência do tendão conjunto (coracobraquial + cabeça curta do bíceps), atuando como reforço dinâmico da estabilidade anterior; · Reparo do subescapular com split muscular controlado, para permitir acesso à glenoide com preservação funcional; · Tratamento da lesão labral associada (Bankart), com reinserção da cápsula anterior; · Microneurólise dos ramos do nervo axilar e musculocutâneo, com o objetivo de reduzir o risco de compressão neuropática; · Tenodese da cabeça longa do bíceps, quando identificada instabilidade, luxação intra-articular ou degeneração tendínea. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.) e Walch et al., a técnica de Bristow-Latarjet está indicada em casos de instabilidade anterior do ombro com perda óssea glenoidal significativa e lesões off-track, oferecendo contenção óssea, reforço ligamentar e bloqueio dinâmico eficaz. A associação de procedimentos complementares visa o controle completo da instabilidade e da dor crônica.',
    'Luxação Glenoumeral',
    'Ortopedia e Traumatologia',
    'Latarjet',
    true
);

-- Justificativa 6: Luxação Acrômio-Clavicular
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Luxação Acrômio-Clavicular',
    'Paciente vítima de trauma de alta energia sobre o ombro, evoluindo com dor intensa, hematoma, deformidade evidente e impotência funcional do membro superior acometido. Ao exame físico, observa-se deformidade acentuada na região da articulação acromioclavicular, com desvio visível e proeminência da extremidade distal da clavícula, dor intensa à palpação, mobilidade anormal da clavícula distal (sinal da tecla), limitação da mobilidade ativa e hematoma em face superior do ombro. Radiografias evidenciam luxação acromioclavicular com deslocamento completo da clavícula distal em relação ao acrômio, compatível com LAC grau III/IV segundo a classificação de Rockwood. Diante do grau elevado de instabilidade, da limitação funcional importante, da deformidade persistente e do risco de evolução para artrose acromioclavicular e disfunção crônica da cintura escapular, solicito internação hospitalar para tratamento cirúrgico com reconstrução da articulação acromioclavicular e dos ligamentos coracoclaviculares. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), luxações acromioclaviculares de grau III a VI sintomáticas ou instáveis após trauma de alta energia são indicações formais de reconstrução cirúrgica, visando restauração anatômica, estabilidade da cintura escapular e retorno funcional.',
    'Luxação Acrômio-Clavicular',
    'Ortopedia e Traumatologia',
    'LAC',
    true
);

-- Justificativa 7: Reparo do Manguito Rotador - Cirurgia Aberta
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Reparo do Manguito Rotador - Cirurgia Aberta',
    'Paciente com dor crônica e progressiva no ombro, com limitação funcional importante, especialmente para elevação e rotação do membro superior. Refere piora dos sintomas nos últimos meses, com prejuízo para atividades básicas e laborais, além de dor noturna recorrente. Realizou tratamento conservador com analgesia e fisioterapia, sem melhora clínica significativa. Ao exame físico, apresenta mobilidade ativa severamente limitada, com Testes de Jobe e Patte não testáveis por impotência funcional. Presença de sinal de desabamento e perda global de força à movimentação ativa. Ressonância magnética evidencia ruptura crônica e irreparável dos tendões do supraespinhoso e infraespinhoso, com retração grau 3 de Patte e degeneração gordurosa grau 3 de Goutallier, além de elevação da cabeça umeral e sinais de artropatia do manguito. Diante da irreparabilidade tendínea, da falha do tratamento conservador e da limitação funcional grave, solicito internação hospitalar para realização de artroplastia reversa do ombro. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), a artroplastia reversa está indicada em pacientes com ruptura crônica do manguito rotador, com artropatia associada, retração e degeneração muscular, especialmente nos casos com pseudoparalisia funcional. Favard et al. também reforçam que a reversa proporciona alívio da dor e melhora funcional em pacientes com artropatia do manguito e comprometimento da mobilidade ativa.',
    'Reparo do Manguito Rotador',
    'Ortopedia e Traumatologia',
    'Cirurgia Aberta',
    true
);

-- Justificativa 8: Artroplastia Reversa - Fratura
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Artroplastia Reversa - Fratura',
    'Paciente vítima de trauma em membro superior, evoluindo com dor intensa, impotência funcional e deformidade no ombro. Ao exame físico, apresenta edema importante, limitação completa da mobilidade ativa e dor à palpação em região de ombro e colo do úmero. Exame de imagem (radiografia e tomografia) evidencia fratura cominutiva do úmero proximal, classificada como fratura em 4 partes segundo Neer, com desvio, separação dos fragmentos tuberositários e risco de necrose avascular da cabeça umeral. Dada a complexidade da fratura, a cominuição dos fragmentos, a perda de alinhamento anatômico e o alto risco de falha na fixação interna, especialmente em pacientes com baixa densidade óssea, solicito internação hospitalar para realização de artroplastia reversa do ombro como tratamento definitivo. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas em 3 ou 4 partes, especialmente em pacientes idosos ou com osso osteoporótico, representam indicação formal para artroplastia reversa, considerando os altos índices de complicações e falhas mecânicas com o uso de osteossíntese convencional. Boileau et al. também reforçam a superioridade da reversa em fraturas cominutivas complexas, com melhor resultado funcional e menor taxa de revisão cirúrgica.',
    'Artroplastia Reversa',
    'Ortopedia e Traumatologia',
    'Fratura',
    true
);

-- Justificativa 9: Reparo do Manguito Rotador - Cirurgia Aberta
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Reparo do Manguito Rotador - Cirurgia Aberta',
    'Paciente com histórico de fratura prévia do úmero proximal, submetido anteriormente a osteossíntese, evoluindo com dor crônica no ombro, limitação funcional progressiva e sinais clínicos de falha da fixação. Relata piora dos sintomas nos últimos meses, com dor contínua, perda de mobilidade ativa e dificuldade para realizar atividades básicas. Ao exame físico, observa-se limitação global da amplitude de movimento, dor à mobilização passiva e ativa, sinal de desabamento, crepitação e impotência funcional à elevação do membro superior. Radiografias e tomografia evidenciam falha da osteossíntese com soltura do material, colapso em varo da cabeça umeral, pseudoartrose e elevação da cabeça umeral em relação à glenoide. Os achados são compatíveis com sequela pós-fratura com artropatia do manguito. Diante da falha do tratamento prévio, da dor persistente e da limitação funcional severa, solicito internação hospitalar para realização de revisão cirúrgica com artroplastia reversa do ombro. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), pacientes com falha de síntese do úmero proximal, necrose da cabeça e comprometimento do manguito rotador têm indicação formal de artroplastia reversa como procedimento de revisão, com melhores taxas de controle da dor e recuperação funcional em comparação à reosteossíntese.',
    'Reparo do Manguito Rotador',
    'Ortopedia e Traumatologia',
    'Cirurgia Aberta',
    true
);

-- Justificativa 10: Fratura da Escápula
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Fratura da Escápula',
    'Paciente vítima de trauma em alta energia, evoluindo com dor intensa, edema e limitação funcional importante do ombro acometido, incapacidade para movimentação ativa e dor à palpação profunda da escápula e região posterior do ombro. Ao exame físico, apresenta limitação acentuada da mobilidade ativa e passiva, dor à movimentação do ombro e crepitação. Palpação dolorosa na borda lateral da escápula. Exames de imagem (radiografias e tomografia computadorizada) evidenciam fratura da escápula com acometimento da superfície articular da glenóide (classificação de Ideberg tipo III), com deslocamento articular significativo, instabilidade e risco de incongruência da articulação glenoumeral. Diante do deslocamento articular, incongruência da superfície da glenóide e risco de evolução para artrose secundária e limitação funcional permanente, solicito internação hospitalar para realização de tratamento cirúrgico com redução aberta e fixação interna da fratura intra-articular da escápula. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas articulares deslocadas da escápula, especialmente com comprometimento da cavidade glenoidal e instabilidade articular, são indicação formal de tratamento operatório, com o objetivo de restaurar a congruência articular e preservar a função do ombro.',
    'Fratura da Escápula',
    'Ortopedia e Traumatologia',
    'Osteossíntese',
    true
);

-- Justificativa 11: Fratura da Clavícula
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Fratura da Clavícula',
    'Paciente vítima de trauma direto sobre o ombro, evoluindo com dor intensa, edema local e deformidade visível em topografia de clavícula. Refere limitação funcional importante e dor à movimentação do ombro. Ao exame físico, observa-se deformidade evidente na face anterior do ombro, palpação dolorosa e mobilidade anormal no trajeto da clavícula. Mobilidade ativa do ombro limitada pela dor. Radiografias demonstram fratura da diáfise clavicular com desvio significativo dos fragmentos e encurtamento do eixo clavicular. Os achados são compatíveis com fratura instável, com risco de consolidação viciosa e limitação funcional futura. Diante do padrão instável da fratura, do desvio com encurtamento e da perda do alinhamento anatômico, solicito internação hospitalar para realização de tratamento cirúrgico com redução aberta e fixação interna da clavícula. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas desviadas e instáveis da diáfise da clavícula, especialmente com encurtamento > 2 cm, sobreposição dos fragmentos ou risco de pseudartrose, são indicações formais de tratamento cirúrgico.',
    'Fratura da Clavícula',
    'Ortopedia e Traumatologia',
    'Osteossíntese',
    true
);

-- Justificativa 12: Procedimento Ortopédico Geral
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Procedimento Ortopédico Geral',
    'Paciente vítima de trauma direto em ombro, evoluindo com dor intensa e limitação funcional importante, associadas a edema e sensibilidade à palpação profunda na região ântero-superior do ombro. Ao exame físico, apresenta dor à mobilização ativa do ombro, limitação de movimento, crepitação e dor à palpação do processo coracoide. Não há sinais de comprometimento neurovascular distal. Radiografias (com incidências específicas) e tomografia computadorizada confirmam fratura do processo coracoide da escápula, com desvio significativo do fragmento, classificada como fratura da base do coracoide. O desvio compromete a inserção do complexo coraco-clavicular, caracterizando instabilidade do anel escapular (SSSC). Diante do desvio, do comprometimento da estabilidade da cintura escapular e do risco de não consolidação ou pseudartrose dolorosa, solicito internação hospitalar para tratamento cirúrgico com redução aberta e fixação interna da fratura do processo coracoide. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas do processo coracoide são raras, mas quando há desvio, especialmente na base do processo e/ou com envolvimento das estruturas do sistema suspensor escapular (SSSC), existe indicação formal de tratamento cirúrgico com redução aberta e fixação interna, com o objetivo de restaurar a anatomia e preservar a função do complexo escápulo-clavicular.',
    'Procedimento Ortopédico',
    'Ortopedia e Traumatologia',
    'Cirurgia Aberta',
    true
);

-- Justificativa 13: Reparo do Manguito Rotador - Cirurgia Aberta
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Reparo do Manguito Rotador - Cirurgia Aberta',
    'Paciente vítima de trauma em membro superior, evoluindo com dor intensa, edema, hematoma e impotência funcional do ombro acometido. Apresenta deformidade e limitação completa da mobilidade. Ao exame físico, observa-se dor intensa à movimentação passiva e ativa, crepitação óssea, hematoma difuso em face anterior e lateral do ombro, além de palpação dolorosa na topografia de colo umeral. Radiografias e tomografia computadorizada evidenciam fratura da extremidade proximal do úmero, classificada como fratura em três partes segundo Neer, com desvio em varo da cabeça umeral e destacamento da grande tuberosidade. O padrão radiológico é compatível com possibilidade de redução aberda e fixação interna . Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas proximais do úmero com padrão redutível e boa qualidade óssea deve ser tratadas com RAFI, com o objetivo de restaurar a anatomia, permitir reabilitação precoce e preservar a função do ombro. Solicito internação hospitalar para realização de tratamento cirúrgico com redução aberta, reparo do manguito rotador e fixação interna com placa bloqueada e parafusos.',
    'Reparo do Manguito Rotador',
    'Ortopedia e Traumatologia',
    'Cirurgia Aberta',
    true
);

-- Justificativa 14: Fratura Diafisária do Úmero - Haste
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Fratura Diafisária do Úmero - Haste',
    'Paciente vítima de trauma direto em membro superior, evoluindo com dor intensa, hematoma, deformidade evidente e impotência funcional do braço acometido. Ao exame físico, apresenta dor intensa à palpação ao longo da diáfise umeral, deformidade visível, crepitação óssea e hematoma em face medial do braço. Mobilidade ativa do ombro e cotovelo está abolida devido à dor. Radiografias demonstram fratura diafisária do úmero com desvio significativo, traço instável e padrão oblíquo longo. Ausência de envolvimento articular ou lesão patológica. Diante do desvio importante, instabilidade do traço e risco de pseudartrose, solicito internação hospitalar para realização de tratamento cirúrgico com fixação interna utilizando haste intramedular bloqueada. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas diafisárias desviadas, com traço instável ou que evoluam com impotência funcional, dor intensa e risco de má consolidação, devem ser tratadas cirurgicamente com haste intramedular, visando estabilização biomecânica, menor agressão muscular e recuperação funcional precoce.',
    'Fratura Diafisária do Úmero',
    'Ortopedia e Traumatologia',
    'Haste Intramedular',
    true
);

-- Justificativa 15: Fratura Diafisária do Úmero - Haste
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Fratura Diafisária do Úmero - Haste',
    'Paciente vítima de trauma direto em membro superior, evoluindo com dor intensa, hematoma, deformidade evidente e impotência funcional do braço acometido. Ao exame físico, observa-se dor intensa à palpação da diáfise umeral, crepitação, hematoma difuso em face medial do braço e deformidade com mobilidade anormal. Mobilidade ativa abolida por dor. Sinais neurovasculares periféricos preservados clinicamente, mas com suspeita de tração sobre o nervo radial devido à proximidade do foco fraturário. Radiografias evidenciam fratura diafisária do úmero com traço instável presença de desalinhamento significativo dos fragmentos e risco de comprometimento neurovascular. Diante da instabilidade da fratura e da necessidade de visualização e proteção do nervo radial, solicito internação hospitalar para realização de tratamento cirúrgico com redução aberta e fixação interna com placa lateral e parafusos. Será realizada a identificação, isolamento e proteção do nervo radial, com retirada do mesmo do foco de fratura. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas diafisárias que não apresentam indicação para haste — por traço, localização ou risco de lesão nervosa — devem ser tratadas com RAFI e proteção do nervo radial, especialmente em fraturas do terço médio do úmero. O procedimento permite alinhamento anatômico, fixação estável e prevenção de complicações neurológicas.',
    'Fratura Diafisária do Úmero',
    'Ortopedia e Traumatologia',
    'Haste Intramedular',
    true
);

-- Justificativa 16: Fratura da Extremidade Distal do Úmero
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Fratura da Extremidade Distal do Úmero',
    'Paciente vítima de trauma de alta energia no cotovelo, evoluindo com dor intensa, hematoma, deformidade visível e impotência funcional do membro superior acometido. Ao exame físico, apresenta dor intensa à palpação da região do cotovelo, deformidade evidente, limitação completa da mobilidade ativa e passiva, crepitação óssea e hematoma difuso em face posterior e lateral. Radiografias e tomografia computadorizada evidenciam fratura da extremidade distal do úmero, com desvio articular, configurando fratura intra-articular instável. Diante da incongruência articular, instabilidade do cotovelo e risco de rigidez, má consolidação e perda funcional, solicito internação hospitalar para realização de tratamento cirúrgico com redução aberta e fixação interna com placas e parafusos, visando reconstrução anatômica e mobilização precoce. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas articulares da extremidade distal do úmero, especialmente em traumas de alta energia, exigem redução anatômica e fixação rígida com dupla placa, a fim de preservar a mobilidade e prevenir artrose pós-traumática.',
    'Fratura da Extremidade Distal do Úmero',
    'Ortopedia e Traumatologia',
    'Placa e Parafusos',
    true
);

-- Justificativa 17: Fratura da Cabeça do Rádio - Osteossíntese
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Fratura da Cabeça do Rádio - Osteossíntese',
    'Paciente vítima de trauma direto em cotovelo, evoluindo com dor intensa, hematoma, deformidade e impotência funcional do membro superior acometido. Ao exame físico, apresenta dor intensa à palpação na região lateral do cotovelo, crepitação e limitação global da mobilidade ativa e passiva. Hematoma visível em face lateral do cotovelo e sensibilidade acentuada à movimentação. Radiografias e tomografia computadorizada evidenciam fratura articular da cabeça do rádio, com traço único ou poucos fragmentos, sem cominuição, com padrão redutível e viável para fixação interna estável (Mason tipo II). Diante da estabilidade potencial da fratura, da preservação do contorno articular e da possibilidade de fixação anatômica, solicito internação hospitalar para realização de tratamento cirúrgico com redução aberta e fixação interna da cabeça do rádio, utilizando parafusos de compressão sem cabeça (headless screws) e/ou placa anatômica de baixo perfil, conforme necessidade intraoperatória. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas da cabeça do rádio com traços redutíveis e articulação preservada devem ser tratadas com RAFI, a fim de manter a congruência radiocapitular, evitar instabilidade secundária e permitir reabilitação precoce com preservação da mobilidade.',
    'Fratura da Cabeça do Rádio',
    'Ortopedia e Traumatologia',
    'Osteossíntese',
    true
);

-- Justificativa 18: Fratura da Cabeça do Rádio - Artroplastia
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Fratura da Cabeça do Rádio - Artroplastia',
    'Paciente vítima de trauma de alta energia no cotovelo, evoluindo com dor intensa, hematoma, deformidade e impotência funcional do membro superior acometido. Ao exame físico, apresenta dor intensa à palpação do cotovelo, deformidade lateral, limitação completa da mobilidade ativa e passiva, crepitação e hematoma em face lateral e posterior do cotovelo. Radiografias e tomografia computadorizada evidenciam fratura cominutiva da cabeça do rádio, com múltiplos fragmentos articulares, perda da congruência radiocapitular e impossibilidade de fixação estável, configurando fratura irreconstruível (classificação de Mason tipo III). Diante da instabilidade articular, impossibilidade de fixação e risco de perda da estabilidade lateral do cotovelo, solicito internação hospitalar para realização de artroplastia da cabeça do rádio, com implante protético metálico anatômico. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.) e Morrey (The Elbow and Its Disorders), a artroplastia da cabeça radial é indicada em fraturas cominutivas não fixáveis, com fragmentos intra-articulares e instabilidade associada, com o objetivo de restaurar a biomecânica articular, prevenir subluxação e permitir reabilitação precoce.',
    'Fratura da Cabeça do Rádio',
    'Ortopedia e Traumatologia',
    'Artroplastia',
    true
);

-- Justificativa 19: Fratura do Olécrano
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Fratura do Olécrano',
    'Paciente vítima de trauma direto em cotovelo, evoluindo com dor intensa, hematoma, deformidade evidente e impotência funcional do membro superior acometido. Ao exame físico, apresenta deformidade posterior do cotovelo, dor intensa à palpação do olécrano, crepitação óssea, hematoma em face posterior e limitação total da extensão ativa. Radiografias e tomografia computadorizada evidenciam fratura da apófise do olécrano com desvio dos fragmentos, perda de continuidade articular e afastamento da inserção do tríceps, configurando instabilidade do mecanismo extensor. O padrão é compatível com fratura instável (Mayo tipo II ou III). Diante do desvio articular, da perda da extensão ativa e da instabilidade do cotovelo, solicito internação hospitalar para realização de tratamento cirúrgico com redução aberta e fixação interna com placa anatômica posterior e parafusos, respeitando os princípios de reconstrução articular e fixação rígida. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), fraturas desviadas do olécrano com perda da congruência articular e comprometimento do mecanismo extensor devem ser tratadas com RAFI para restaurar a anatomia, permitir mobilização precoce e evitar rigidez e artrose pós-traumática.',
    'Fratura do Olécrano',
    'Ortopedia e Traumatologia',
    'Osteossíntese',
    true
);

-- Justificativa 20: Ruptura do Peitoral Maior
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Ruptura do Peitoral Maior',
    'Paciente vítima de trauma em membro superior, evoluindo com dor aguda e intensa na região ântero-lateral do ombro e tórax, associada a edema, equimose e deformidade local. Refere perda funcional, com dificuldade para realizar adução e rotação interna do ombro, especialmente contra resistência. Ao exame físico, observa-se assimetria da prega anterior da axila, retração do músculo peitoral maior, equimose em face anterior do tórax e dor à palpação da inserção do tendão no úmero. Há também perda de força à adução e rotação interna contra resistência, confirmando comprometimento funcional. O quadro clínico e os achados ao exame físico são compatíveis com ruptura traumática do tendão do músculo peitoral maior, com desinserção de sua inserção no úmero. Diante disso, solicito internação hospitalar para tratamento cirúrgico de urgência.',
    'Ruptura do Peitoral Maior',
    'Ortopedia e Traumatologia',
    'Cirurgia Aberta',
    true
);

-- Justificativa 21: Procedimento Ortopédico Geral
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Procedimento Ortopédico Geral',
    'Paciente vítima de trauma em membro superior, evoluindo com dor aguda e intensa na região anterior do cotovelo, associada a edema, equimose e deformidade local. Refere perda funcional, com dificuldade para realizar supinação do antebraço, especialmente contra resistência. Ao exame físico, apresenta deformidade compatível com retração proximal do ventre muscular do bíceps, palpação dolorosa na fossa antecubital e ausência de continuidade tendínea distal, evidenciada por Hook Test positivo. Observa-se também perda de força à supinação ativa contra resistência, confirmando comprometimento funcional. O quadro clínico e os achados ao exame físico são compatíveis com ruptura traumática do tendão distal do bíceps braquial, com desinserção de sua inserção na tuberosidade radial. Diante disso, solicito internação hospitalar para tratamento cirúrgico de urgência.',
    'Procedimento Ortopédico',
    'Ortopedia e Traumatologia',
    'Cirurgia Aberta',
    true
);

-- Justificativa 22: Infiltração e Bloqueio do Ombro
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Infiltração e Bloqueio do Ombro',
    'Paciente com quadro de dor lateral no cotovelo dominante, com piora progressiva há vários meses, associada a esforço físico e movimentos de preensão. Relata falha com medicação analgésica oral e fisioterapia funcional. Ao exame físico, apresenta dor intensa à palpação no epicôndilo lateral, dor à extensão resistida do punho e dos dedos, teste de Cozen positivo. Ressonância magnética evidencia lesão parcial da origem do tendão extensor radial curto do carpo (ECRB), sem rotura completa. Diante da falha do tratamento clínico convencional e persistência da dor incapacitante, solicito autorização para realização de bloqueio e infiltração da região do epicôndilo lateral, utilizando corticóide de depósito e anestésico local, com objetivo de promover alívio da dor e reverter o processo inflamatório local. Segundo literatura especializada (Nirschl, Rockwood), infiltrações podem ser indicadas em casos de epicondilite lateral refratária ao tratamento conservador, como alternativa terapêutica antes da indicação cirúrgica.',
    'Infiltração e Bloqueio',
    'Ortopedia e Traumatologia',
    'Bloqueio - Guiado por USG',
    true
);

-- Justificativa 23: Epicondilite - Artroscopia
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Epicondilite - Artroscopia',
    'Paciente com diagnóstico de epicondilite lateral crônica no cotovelo dominante, com dor persistente há vários meses, refratária a tratamento conservador prolongado, incluindo analgesia oral, fisioterapia supervisionada e infiltração com corticosteroide. Retorna com manutenção dos sintomas, limitação funcional e piora da dor aos esforços. Ao exame físico, apresenta dor intensa à palpação no epicôndilo lateral, dor à extensão resistida do punho e dedos, teste de Cozen positivo, além de diminuição de performance funcional e dor irradiada para o antebraço lateral, compatível com envolvimento de ramos sensitivos superficiais. Ressonância magnética evidencia lesão parcial do tendão extensor radial curto do carpo (ECRB), com sinais de degeneração tendínea insercional. O quadro clínico é compatível com epicondilite lateral crônica, refratária e com suspeita de irritação de ramos do nervo radial. Diante da falha do tratamento conservador e da persistência do quadro álgico e funcional, solicito autorização para realização de procedimento cirúrgico por via artroscópica: Debridamento artroscópico da origem tendínea do extensor radial curto do carpo, com limpeza da área degenerada e remoção do tecido inflamado; Estímulo ósseo na área de inserção epicondilar (microfraturas ou shaver), para promover resposta vascular e reparo biológico da entese; Microneurólise artroscópica dos ramos sensitivos do nervo radial (ramo intermuscular lateral), quando identificados sinais de fibrose ou aderência; Segundo Baker et al. e literatura citada em Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), o tratamento artroscópico da epicondilite lateral é indicado em casos refratários ao tratamento clínico, com benefícios como menor morbidade tecidual, recuperação mais rápida e possibilidade de avaliação intra-articular simultânea. A microneurólise pode ser realizada com visualização direta dos ramos comprometidos.',
    'Epicondilite Lateral',
    'Ortopedia e Traumatologia',
    'Artroscopia',
    true
);

-- Justificativa 24: Epicondilite - Cirurgia Aberta
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Epicondilite - Cirurgia Aberta',
    'Paciente com diagnóstico de epicondilite lateral crônica no cotovelo dominante, com quadro doloroso persistente há vários meses, refratário a tratamento conservador prolongado, incluindo fisioterapia, analgesia oral e infiltração local com corticosteroide. Retorna com manutenção dos sintomas e piora da dor à movimentação funcional e esforço. Ao exame físico, apresenta dor intensa à palpação do epicôndilo lateral, dor à extensão resistida do punho e dos dedos, sinal de Cozen positivo e queda de desempenho funcional em tarefas simples. A dor é localizada, com possível irradiação lateral, sugerindo componente neurogênico superficial. Ressonância magnética evidencia lesão parcial do tendão extensor radial curto do carpo (ECRB), com sinais de degeneração tendínea e falha de cicatrização. O quadro clínico é compatível com epicondilite lateral crônica com degeneração insercional e componente neurogênico periférico associado. Diante da falha de múltiplas abordagens conservadoras e do comprometimento funcional persistente, solicito autorização para tratamento cirúrgico com as seguintes etapas: Liberação e debridamento do tendão extensor radial curto do carpo na origem do epicôndilo lateral; Reinserção anatômica do tendão ao osso, com uso de âncoras; Osteotomia parcial do epicôndilo lateral, visando estimular a resposta osteotendínea e vascularização local; Microneurólise dos ramos sensitivos do nervo radial (ramo intermuscular lateral), devido à suspeita de irritação ou fibrose local, como causa de dor crônica refratária. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.) e Nirschl et al., o tratamento cirúrgico com liberação tendínea, reinserção e osteotomia está indicado em pacientes com epicondilite lateral crônica e degenerativa, que não respondem ao tratamento conservador. A microneurólise está indicada quando há sintomas neuropáticos associados e dor localizada persistente à palpação de ramos sensitivos.',
    'Epicondilite Lateral',
    'Ortopedia e Traumatologia',
    'Cirurgia Aberta',
    true
);

-- Justificativa 25: Epicondilite - Cirurgia Aberta
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Epicondilite - Cirurgia Aberta',
    'Paciente com diagnóstico de epicondilite medial no cotovelo dominante, com dor persistente há vários meses, refratário ao tratamento conservador inicial, incluindo analgesia oral e fisioterapia motora orientada. Refere dor localizada, piora aos esforços e impacto funcional nas atividades de vida diária e laborais. Ao exame físico, apresenta dor à palpação do epicôndilo medial, dor à flexão resistida do punho e dedos, além de teste de Cozen invertido positivo. Exame de imagem (ressonância magnética) demonstra espessamento da origem comum dos flexores e lesão parcial insercional, compatível com quadro de epicondilite medial degenerativa. Diante da persistência do quadro doloroso, da falha do tratamento fisioterapêutico isolado e com objetivo de promover alívio inflamatório e melhora clínica antes da indicação cirúrgica, solicito autorização para realização de infiltração terapêutica na região do epicôndilo medial com corticóide de depósito associado a anestésico local. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), a infiltração local é indicada em casos de epicondilite medial com resposta insatisfatória ao tratamento conservador clínico e fisioterapêutico, sendo uma medida eficaz de alívio sintomático antes de considerar tratamento cirúrgico. Exame de imagem (ressonância magnética) demonstra espessamento da origem comum dos flexores e lesão parcial insercional, compatível com quadro de epicondilite medial degenerativa. Diante da persistência do quadro doloroso, da falha do tratamento fisioterapêutico isolado e com objetivo de promover alívio inflamatório e melhora clínica antes da indicação cirúrgica, solicito autorização para realização de infiltração terapêutica na região do epicôndilo medial com corticóide de depósito associado a anestésico local. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), a infiltração local é indicada em casos de epicondilite medial com resposta insatisfatória ao tratamento conservador clínico e fisioterapêutico, sendo uma medida eficaz de alívio sintomático antes de considerar tratamento cirúrgico.',
    'Epicondilite Lateral',
    'Ortopedia e Traumatologia',
    'Cirurgia Aberta',
    true
);

-- Justificativa 26: Epicondilite - Cirurgia Aberta
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Epicondilite - Cirurgia Aberta',
    'Paciente com diagnóstico de epicondilite medial crônica no cotovelo dominante, com dor persistente há vários meses, refratário ao tratamento conservador, incluindo analgesia oral, fisioterapia funcional e infiltração local com corticosteroide. Retorna com limitação funcional, dor incapacitante e piora progressiva aos esforços. Ao exame físico, apresenta dor intensa à palpação do epicôndilo medial, dor à flexão resistida do punho e dedos, teste de reverso de Cozen positivo, e sintomas sugestivos de irritação do nervo ulnar (parestesias intermitentes no quarto e quinto dedos). Ressonância magnética evidencia lesão parcial da origem comum dos flexores, com degeneração tendínea e espessamento. Há ainda sinais de edema e possível fibrose ao redor do trajeto proximal do nervo ulnar. Diante da falência do tratamento clínico e da persistência do quadro doloroso e funcional, solicito internação hospitalar para realização de procedimento cirúrgico com: Liberação da origem comum dos músculos flexores do antebraço com debridamento da área degenerada; Estimulação óssea no epicôndilo medial (curetagem e perfurações) para promover reparo biológico; Microneurólise do nervo ulnar na região retrocondilar, com liberação de aderências perineurais; Reinserção tendínea, quando indicada, com sutura transóssea ou âncoras, conforme avaliação intraoperatória.',
    'Epicondilite Lateral',
    'Ortopedia e Traumatologia',
    'Cirurgia Aberta',
    true
);

-- Justificativa 27: Bursite de Olécrano
INSERT INTO clinical_justifications (title, content, category, specialty, procedure_type, is_active)
VALUES (
    'Bursite de Olécrano',
    'Paciente com quadro clínico de bursite olecraniana no cotovelo, apresentando aumento de volume posterior, dor persistente, limitação funcional e desconforto mecânico. Já realizou tratamento conservador com anti-inflamatórios, repouso articular e fisioterapia, além de drenagem prévia, porém mantém recidivas e desconforto persistente. Ao exame físico, observa-se aumento de volume arredondado e flutuante na região posterior do olécrano, dor à palpação, espessamento da bursa e limitação da mobilidade ativa em flexão total. A pele apresenta áreas de atrito e hiperemia local intermitente, sem sinais de infecção ativa no momento. Ultrassonografia evidencia bursite olecraniana crônica com espessamento da parede da bursa, septações internas e conteúdo denso, sem comunicação articular evidente. Diante da falha do tratamento clínico, do caráter recidivante e da persistência do quadro inflamatório crônico, solicito autorização para realização de bursectomia cirúrgica do olécrano, com excisão completa da bursa olecraniana e tratamento do tecido cicatricial adjacente, com o objetivo de resolução definitiva do quadro. Segundo Rockwood et al. (Shoulder and Elbow Surgery, 5ª ed.), a bursectomia é indicada em casos de bursite crônica refratária, com espessamento, fibrose ou recidivas frequentes, especialmente após insucesso de medidas conservadoras.',
    'Bursite de Olécrano',
    'Ortopedia e Traumatologia',
    'Tratamento Cirúrgico',
    true
);

COMMIT;

-- Verificar importação
SELECT COUNT(*) as total_justificativas FROM clinical_justifications;
SELECT category, COUNT(*) as count FROM clinical_justifications GROUP BY category ORDER BY count DESC;
SELECT procedure_type, COUNT(*) as count FROM clinical_justifications GROUP BY procedure_type ORDER BY count DESC;