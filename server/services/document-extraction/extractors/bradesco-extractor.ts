/**
 * Extrator especializado para carteirinhas Bradesco Saúde
 * Implementa padrões específicos de extração para documentos Bradesco
 */

import { CNSValidator } from '../utils/cns-validator';

interface InsuranceExtractedData {
  operadora?: string;
  numeroCarteirinha?: string;
  plano?: string;
  nomeTitular?: string;
  cns?: string;
}

export class BradescoExtractor {
  /**
   * Extrai número da carteirinha específico do Bradesco (excluindo CNS)
   */
  extractCardNumber(text: string): string | null {
    console.log('🔍 Bradesco: Extraindo número da carteirinha...');
    
    // Remover CNS conhecido do texto para análise
    const cnsNumber = CNSValidator.extractCNS(text);
    let workingText = text;
    if (cnsNumber) {
      workingText = text.replace(new RegExp(cnsNumber, 'g'), '');
    }
    
    // Padrão específico para capturar número completo com 4 grupos: 954 390 098795 004
    const bradescoCompletePattern = /(\d{3})\s+(\d{3})\s+(\d{6})\s+(\d{3})/;
    const completeMatch = workingText.match(bradescoCompletePattern);
    
    if (completeMatch) {
      const fragments = [completeMatch[1], completeMatch[2], completeMatch[3], completeMatch[4]];
      const candidateNumber = fragments.join('');
      
      console.log(`🔍 Candidato completo encontrado: ${fragments.join(' ')} → ${candidateNumber} (${candidateNumber.length} dígitos)`);
      
      // Verificar se não é CNS e tem 15 dígitos
      if (candidateNumber.length === 15 && !CNSValidator.isCNSNumber(candidateNumber)) {
        console.log(`✅ Bradesco: Número completo da carteirinha: ${candidateNumber}`);
        return candidateNumber;
      }
    }
    
    // Fallback: padrão de 3 grupos sem dígito verificador
    const fallbackPattern = /(\d{3})\s+(\d{3})\s+(\d{6})/;
    const fallbackMatch = workingText.match(fallbackPattern);
    
    if (fallbackMatch) {
      const fragments = [fallbackMatch[1], fallbackMatch[2], fallbackMatch[3]];
      const candidateNumber = fragments.join('');
      
      console.log(`🔍 Fallback encontrado: ${fragments.join(' ')} → ${candidateNumber} (${candidateNumber.length} dígitos)`);
      
      if (candidateNumber.length === 12 && !CNSValidator.isCNSNumber(candidateNumber)) {
        console.log(`✅ Bradesco: Número da carteirinha (fallback): ${candidateNumber}`);
        return candidateNumber;
      }
    }

    // Estratégia 3: Buscar qualquer sequência de 15 dígitos no texto original (sem remover CNS)
    const allNumbersPattern = /\b\d{15}\b/g;
    const allMatches = text.match(allNumbersPattern);
    
    if (allMatches) {
      for (const match of allMatches) {
        if (!CNSValidator.isCNSNumber(match)) {
          console.log(`✅ Bradesco: Número da carteirinha encontrado (15 dígitos direto): ${match}`);
          return match;
        }
      }
    }

    console.log('❌ Bradesco: Número da carteirinha não encontrado');
    return null;
  }

  /**
   * Extrai CNS usando utilitário global
   */
  extractCNS(text: string): string | null {
    console.log('🔍 Bradesco: Extraindo CNS...');
    const cns = CNSValidator.extractCNS(text);
    if (cns) {
      console.log(`✅ Bradesco: CNS extraído: ${cns}`);
    } else {
      console.log('❌ Bradesco: CNS não encontrado');
    }
    return cns;
  }

  /**
   * Extrai plano específico do Bradesco
   * Padrões comuns: SAUDE TOP, SAUDE ESSENCIAL, SAUDE EXECUTIVO, etc.
   */
  extractPlan(text: string): string | null {
    console.log('🔍 Bradesco: Extraindo plano...');
    
    const normalizedText = text.toUpperCase();
    
    // 1. Primeiro buscar planos compostos do Bradesco (SAUDE/SAÚDE + modificador)
    const composedPlans = [
      'SAUDE TOP',
      'SAÚDE TOP',
      'SAUDE PLUS',
      'SAÚDE PLUS',
      'SAUDE PREMIUM',
      'SAÚDE PREMIUM',
      'SAUDE EXECUTIVO',
      'SAÚDE EXECUTIVO',
      'SAUDE MASTER',
      'SAÚDE MASTER',
      'SAUDE ESSENCIAL',
      'SAÚDE ESSENCIAL',
      'SAUDE CLASSICO',
      'SAÚDE CLÁSSICO',
      'SAUDE BASIC',
      'SAÚDE BASIC',
      'SAUDE BASICO',
      'SAÚDE BASICO',
      'SAUDE STANDARD',
      'SAÚDE STANDARD',
      'SAUDE DIAMANTE',
      'SAÚDE DIAMANTE',
      'SAUDE OURO',
      'SAÚDE OURO',
      'SAUDE PRATA',
      'SAÚDE PRATA'
    ];
    
    for (const plan of composedPlans) {
      if (normalizedText.includes(plan)) {
        console.log(`✅ Bradesco: Plano composto encontrado: ${plan}`);
        // Normalizar para formato sem acento para consistência
        return plan.replace('SAÚDE', 'SAUDE');
      }
    }

    // 2. Buscar padrões específicos do Bradesco com SAUDE/SAÚDE
    const saudePlanPatterns = [
      /SAÚDE\s+([A-ZÁÊÔÇ]{2,15})/g, // SAÚDE + palavra seguinte
      /SAUDE\s+([A-ZÁÊÔÇ]{2,15})/g, // SAUDE + palavra seguinte
      /(?:PLANO|PRODUTO|MODALIDADE)[:\s]+SAÚDE\s+([A-ZÁÊÔÇ]{2,15})/i,
      /(?:PLANO|PRODUTO|MODALIDADE)[:\s]+SAUDE\s+([A-ZÁÊÔÇ]{2,15})/i,
      /BRADESCO\s+SAÚDE\s+([A-ZÁÊÔÇ]{2,15})/i,
      /BRADESCO\s+SAUDE\s+([A-ZÁÊÔÇ]{2,15})/i,
    ];

    for (const pattern of saudePlanPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const fullPlan = `SAUDE ${match[1].trim()}`;
        console.log(`✅ Bradesco: Plano SAUDE encontrado via padrão: ${fullPlan}`);
        return fullPlan;
      }
    }

    // 3. Planos simples (fallback)
    const simplePlans = [
      'ESSENCIAL',
      'EXECUTIVO', 
      'MASTER',
      'CLÁSSICO',
      'CLASSICO',
      'PREMIUM',
      'PLUS',
      'BASIC',
      'BASICO',
      'STANDARD',
      'SAUDE' // Como último recurso
    ];
    
    for (const plan of simplePlans) {
      if (normalizedText.includes(plan)) {
        console.log(`✅ Bradesco: Plano simples encontrado: ${plan}`);
        return plan;
      }
    }

    // 4. Buscar por padrões genéricos após palavras-chave
    const genericPlanPatterns = [
      /(?:PLANO|PRODUTO|MODALIDADE)[:\s]+([A-ZÁÊÔÇ\s]{3,25})/i,
      /BRADESCO\s+([A-ZÁÊÔÇ\s]{3,25})/i,
    ];

    for (const pattern of genericPlanPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const planName = match[1].trim();
        if (planName.length > 2 && planName.length < 25) {
          console.log(`✅ Bradesco: Plano encontrado via padrão genérico: ${planName}`);
          return planName;
        }
      }
    }

    console.log('❌ Bradesco: Plano não encontrado');
    return null;
  }

  /**
   * Extrai nome do titular específico do Bradesco
   */
  extractHolderName(text: string): string | null {
    console.log('🔍 Bradesco: Extraindo nome do titular...');
    
    const namePatterns = [
      /(?:TITULAR|BENEFICIÁRIO|NOME)[:\s]+([A-ZÁÊÔÇÀÁÃÂÉÍÓÚÇ\s]{5,50})/i,
      /USUÁRIO[:\s]+([A-ZÁÊÔÇÀÁÃÂÉÍÓÚÇ\s]{5,50})/i,
      /([A-ZÁÊÔÇÀÁÃÂÉÍÓÚÇ]{2,}\s+[A-ZÁÊÔÇÀÁÃÂÉÍÓÚÇ\s]{5,40})/
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        
        // Validar se parece um nome válido
        if (this.isValidName(name)) {
          console.log(`✅ Bradesco: Nome encontrado: ${name}`);
          return name;
        }
      }
    }

    console.log('❌ Bradesco: Nome do titular não encontrado');
    return null;
  }

  /**
   * Calcula confiança específica para Bradesco
   */
  getConfidence(data: InsuranceExtractedData): number {
    let confidence = 0;
    let factors = 0;

    // Operadora confirmada
    if (data.operadora === 'BRADESCO') {
      confidence += 0.3;
      factors++;
    }

    // Número da carteirinha (peso maior para Bradesco)
    if (data.numeroCarteirinha) {
      if (data.numeroCarteirinha.length === 15) {
        confidence += 0.4; // Alta confiança para números de 15 dígitos
      } else {
        confidence += 0.2;
      }
      factors++;
    }

    // Plano identificado
    if (data.plano) {
      confidence += 0.2;
      factors++;
    }

    // Nome do titular
    if (data.nomeTitular) {
      confidence += 0.1;
      factors++;
    }

    return factors > 0 ? confidence : 0;
  }

  /**
   * Valida se o texto extraído parece um nome válido
   */
  private isValidName(name: string): boolean {
    const cleanName = name.trim();
    
    // Muito curto ou muito longo
    if (cleanName.length < 5 || cleanName.length > 50) {
      return false;
    }

    // Deve ter pelo menos 2 palavras
    const words = cleanName.split(/\s+/);
    if (words.length < 2) {
      return false;
    }

    // Não deve conter números ou símbolos
    if (/[0-9@#$%^&*()+=\[\]{}|\\:";'<>?,.\/]/.test(cleanName)) {
      return false;
    }

    // Palavras muito comuns que não são nomes
    const invalidWords = ['CARTEIRINHA', 'BRADESCO', 'SAUDE', 'PLANO', 'TITULAR', 'CPF', 'CNS'];
    const upperName = cleanName.toUpperCase();
    
    for (const invalid of invalidWords) {
      if (upperName.includes(invalid)) {
        return false;
      }
    }

    return true;
  }
}