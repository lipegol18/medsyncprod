/**
 * Detector de Tipo de Documento
 * Identifica se é carteirinha de saúde, RG, CNH, etc.
 * Usa abordagem de "maior número de matches" para melhor precisão
 */

export type DocumentType =
  | "INSURANCE_CARD"
  | "RG_IDENTITY"
  | "CNH_LICENSE"
  | "MV_PATIENT_SCREEN"
  | "UNKNOWN";

export interface DocumentTypeResult {
  type: DocumentType;
  subtype?: string;
  confidence: number;
}

export class DocumentTypeDetector {
  /**
   * Detecta o tipo de documento baseado no texto extraído
   * Conta matches de todos os tipos e escolhe o que tiver maior score
   */
  static detectDocumentType(text: string): DocumentTypeResult {
    const normalizedText = text.toUpperCase().replace(/\s+/g, " ");

    console.log("🔍 DocumentTypeDetector: Analisando texto...");
    console.log(
      "📄 Texto normalizado (primeiros 200 chars):",
      normalizedText.substring(0, 200),
    );

    // Padrões EXCLUSIVOS para carteirinha de saúde
    const insurancePatterns = [
      /CARTÃO NACIONAL DE SAÚDE/,
      /CART[AÃ]O NACIONAL DE SA[UÚ]DE/i,
      /\bCNS\b/, // CNS como palavra isolada
                    /UNIMED|BRADESCO\s+SAÚDE|AMIL|SUL\s*AM[EÉ]RICA|PORTO\s+SEGURO|HAPVIDA|NOTRE\s*DAME|PREVENT\s*SENIOR/,
      /PLANO\s+DE\s+SAÚDE/,
      /BENEFICI[AÁ]RIO/,
      /OPERADORA/,
      /ANS\s*[-:]?\s*\d{6}/,
      /NÚMERO\s+DO\s+CARTÃO/,
      /TITULAR|DEPENDENTE/,
      /UNIMED|BRADESCO|AMIL|SUL\s*AM[EÉ]RICA|PORTO\s+SEGURO|HAPVIDA|NOTRE\s*DAME|PREVENT\s*SENIOR/i,
      /PLANO\s+DE\s+SA[UÚ]DE/i,
      /BENEFICI[AÁ]RIO/i,
    ];

    // Padrões EXCLUSIVOS para RG (não aparecem em CNH)
    const rgExclusivePatterns = [
      /CARTEIRA DE IDENTIDADE(?!\s+NACIONAL)/, // Não seguido de "NACIONAL"
      /REGISTRO GERAL/,
      /SECRETARIA D[AE] SEGURANÇA PÚBLICA/,
      /INSTITUTO DE IDENTIFICAÇÃO/,
      /\bSSP[\/\-]?[A-Z]{2}\b/, // SSP/SP, SSP-RJ, etc.
      /\bSSP\b/, // SSP isolado
      /\bIGP\b/, // IGP isolado
      /PROIBIDO PLASTIFICAR/,
      /FILIAÇÃO/, // Nome dos pais (exclusivo de RG)
      /NATURALIDADE/, // Cidade de nascimento (exclusivo de RG)
      /DOC\.\s*ORIGEM/,
      /ASSINATURA DO DIRETOR/,
      /CARTEIRA DE IDENTIDADE NACIONAL/, // CIN nova
    ];

    // Padrões EXCLUSIVOS para CNH (não aparecem em RG)
    const cnhExclusivePatterns = [
      /CARTEIRA NACIONAL DE HABILITA[CÇ][AÃ]O/i,
      /\bCNH\b/, // CNH como palavra isolada
      /CATEGORIA\s*[:\-]?\s*[A-E]+/, // CATEGORIA: AB, CATEGORIA B, etc.
      /PRIMEIRA HABILITA[CÇ][AÃ]O/i,
      /PERMISS[AÃ]O/, // Permissão para dirigir
      /ACC\b/, // ACC (ciclomotor)
      /CONDUTOR/,
      /HABILITA[CÇ][AÃ]O/i,
      /RENACH/, // Registro Nacional de Carteira de Habilitação
      /DRIVER LICENSE/,
      /PERMISO DE CONDUCCI[OÓ]N/i,
      /SECRETARIA NACIONAL DE TR[AÂ]NSITO/i,
      /DEPARTAMENTO NACIONAL DE TR[AÂ]NSITO/i,
      /MINIST[EÉ]RIO DA INFRAESTRUTURA/i,
      /MINIST[EÉ]RIO DAS CIDADES/i,
      /1[ªº]?\s*HABILITA[CÇ][AÃ]O/i,
      /\bPPD\b/, // Permissão para Dirigir
      /V[AÁ]LIDA\s+EM\s+TODO\s+O\s+TERRIT[OÓ]RIO/i, // Também no RG, mas "VÁLIDA" é mais forte em CNH
    ];

    // Padrões EXCLUSIVOS para tela do sistema MV (prontuário eletrônico)
    // Apenas padrões que NÃO aparecem em carteirinhas de saúde
    const mvPatterns = [
      /VIVACE\s*CONNECT/, // Nome do sistema MV
      /MVPEP/, // URL do sistema MV (aparece em URLs como /mvpep/)
      /MVPEP_LISTA/, // Identificador de lista do MV
      /PRDPEPMV/, // URL do sistema MV
      /ADHOSP\.COM\.BR/, // Domínio do sistema
      /HOSP\.COM\.BR\/MVPEP/, // URL parcial do MV (quando cortada)
      /\/MVPEP\/\d+\/PT-BR/, // Padrão de URL do MV
      /LISTA\s*PACIENTES?.*\/H\/\d+/, // Padrão de URL com ID
      /LISTA\s*URG[EÊ]NCIA/, // Lista de urgência MV
      /LISTA\s*INTERNA[CÇ][AÃ]O/, // Lista de internação MV
      /PW_LISTA/, // Prefixo de lista no MV
      /INFORMA[CÇ][OÕ]ES\s+DO\s+PACIENTE/, // Título da seção
      /LISTA\s+DE\s+ATENDIMENTOS/, // Seção de atendimentos
      /C[OÓ]D\.?\s*PACIENTE/, // Campo específico do MV
      /C[OÓ]D\.?\s*ATENDIMENTO/, // Campo específico do MV
      /MATR[IÍ]CULA\s+SAME/, // SAME é exclusivo de prontuário
      /\bSAME\b.*\d{4,}/, // SAME com número
      /C[OÓ]DIGO\s+DO\s+PACIENTE/, // Campo MV
      /PEP\s*[-–>»]\s*PRESCRI[CÇ][AÃ]O/, // Menu do sistema
      /PEP[»>]\s*URG[EÊ]NCIA/, // Menu PEP Urgência
      /M[EÉ]DICO\s+DE\s+REFER[EÊ]NCIA/, // Campo MV
      /UNIDADE\s+DE\s+REFER[EÊ]NCIA/, // Campo MV
      /FILTRO\s+DE\s+ATENDIMENTOS/, // Filtro MV
      /PREVIS[AÃ]O\s+DE\s+ALTA/, // Campo hospitalar
      /DATA\s+DA\s+ALTA\s+HOSPIT/, // Campo hospitalar
      /NOME\s+DE\s+REGISTRO/, // Campo MV específico
      /[UÚ]LTIMOS\s+\d+\s+ATENDIMENTOS/, // Filtro MV
      /ENDERE[CÇ]O\s+RESIDENCIAL/, // Seção de endereço completo
      /LOGRADOURO.*N[UÚ]MERO.*COMPLEMENTO/, // Campos de endereço juntos
      /AMBULAT[OÓ]RIO/, // Tipo de atendimento
      /COMPLEXO\s+HOSPIT/, // Identificação hospitalar
      /\d+-\s*COMPLEXO/, // Padrão "2- COMPLEXO" comum no MV
      /ATENDIMENTO\s+\d{5,}/, // Código de atendimento (5+ dígitos)
      /IDADE\s+\d{1,3}\s+ANOS?\s+\d{1,2}\s+MESES?\s+E\s+\d{1,2}\s+DIAS?/, // Formato de idade detalhado (ex: "idade 48 anos 7 meses e 5 dias")
    ];

    // Padrões COMPARTILHADOS (aparecem em RG e CNH) - peso menor
    const sharedPatterns = [
      /REPÚBLICA FEDERATIVA DO BRASIL/,
      /\bDETRAN\b/,
      /DATA\s+DE\s+NASCIMENTO/,
      /VÁLIDA? EM TODO O TERRITÓRIO NACIONAL/,
      /\bCPF\b/,
      /EXPEDIÇÃO/,
      /VALIDADE/,
    ];

    // Contar matches de cada tipo
    const insuranceMatches = insurancePatterns.filter((p) =>
      p.test(normalizedText),
    ).length;
    const rgExclusiveMatches = rgExclusivePatterns.filter((p) =>
      p.test(normalizedText),
    ).length;
    const cnhExclusiveMatches = cnhExclusivePatterns.filter((p) =>
      p.test(normalizedText),
    ).length;
    const mvExclusiveMatches = mvPatterns.filter((p) =>
      p.test(normalizedText),
    ).length;
    const sharedMatches = sharedPatterns.filter((p) =>
      p.test(normalizedText),
    ).length;

    // Calcular scores (padrões exclusivos valem mais)
    const insuranceScore = insuranceMatches * 2; // Peso 2 para exclusivos
    const rgScore = rgExclusiveMatches * 2 + sharedMatches * 0.5; // Exclusivos peso 2, compartilhados peso 0.5
    const cnhScore = cnhExclusiveMatches * 2 + sharedMatches * 0.5; // Exclusivos peso 2, compartilhados peso 0.5
    const mvScore = mvExclusiveMatches * 2; // MV tem muitos padrões exclusivos

    console.log("📊 Contagem de matches:");
    console.log(
      `   🏥 Carteirinha: ${insuranceMatches} exclusivos (score: ${insuranceScore})`,
    );
    console.log(
      `   🪪 RG: ${rgExclusiveMatches} exclusivos + ${sharedMatches} compartilhados (score: ${rgScore.toFixed(1)})`,
    );
    console.log(
      `   🚗 CNH: ${cnhExclusiveMatches} exclusivos + ${sharedMatches} compartilhados (score: ${cnhScore.toFixed(1)})`,
    );
    console.log(
      `   🏨 MV: ${mvExclusiveMatches} exclusivos (score: ${mvScore})`,
    );

    // Encontrar o maior score
    const scores = [
      {
        type: "INSURANCE_CARD" as DocumentType,
        score: insuranceScore,
        exclusiveMatches: insuranceMatches,
      },
      {
        type: "RG_IDENTITY" as DocumentType,
        score: rgScore,
        exclusiveMatches: rgExclusiveMatches,
      },
      {
        type: "CNH_LICENSE" as DocumentType,
        score: cnhScore,
        exclusiveMatches: cnhExclusiveMatches,
      },
      {
        type: "MV_PATIENT_SCREEN" as DocumentType,
        score: mvScore,
        exclusiveMatches: mvExclusiveMatches,
      },
    ];

    // Ordenar por score (maior primeiro)
    scores.sort((a, b) => b.score - a.score);
    const winner = scores[0];
    const runnerUp = scores[1];

    console.log(
      `🏆 Vencedor: ${winner.type} (score: ${winner.score.toFixed(1)})`,
    );
    console.log(
      `🥈 Segundo: ${runnerUp.type} (score: ${runnerUp.score.toFixed(1)})`,
    );

    // Precisa de pelo menos 2 matches exclusivos para classificar
    if (winner.exclusiveMatches < 2) {
      console.log("❌ Documento não detectado - menos de 2 matches exclusivos");
      return {
        type: "UNKNOWN",
        confidence: 0.1,
      };
    }

    // Calcular confiança baseada na diferença entre primeiro e segundo
    const scoreDiff = winner.score - runnerUp.score;
    let confidence: number;

    if (scoreDiff >= 4) {
      confidence = 0.95; // Diferença grande = alta confiança
    } else if (scoreDiff >= 2) {
      confidence = 0.85;
    } else if (scoreDiff >= 1) {
      confidence = 0.75;
    } else {
      confidence = 0.65; // Scores muito próximos = menor confiança
    }

    // Bônus por número de matches exclusivos
    confidence = Math.min(0.98, confidence + winner.exclusiveMatches * 0.02);

    console.log(
      `✅ DETECTADO: ${winner.type} com confiança ${(confidence * 100).toFixed(0)}%`,
    );

    // Nota: Subtipo de RG é detectado pelo identity-orchestrator.ts
    // para manter consistência com cnh-orchestrator.ts

    return {
      type: winner.type,
      confidence,
    };
  }

  /**
   * Verifica se o documento é uma carteirinha de saúde
   */
  static isInsuranceCard(text: string): boolean {
    const result = this.detectDocumentType(text);
    return result.type === "INSURANCE_CARD" && result.confidence > 0.7;
  }

  /**
   * Verifica se o documento é um RG
   */
  static isIdentityDocument(text: string): boolean {
    const result = this.detectDocumentType(text);
    return result.type === "RG_IDENTITY" && result.confidence > 0.7;
  }
}
