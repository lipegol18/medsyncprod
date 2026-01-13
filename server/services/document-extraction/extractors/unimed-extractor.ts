/**
 * Extrator especializado para carteirinhas Unimed
 * Implementa padrões específicos de extração para documentos Unimed
 */

import { CNSValidator } from '../utils/cns-validator';

interface InsuranceExtractedData {
  operadora?: string;
  numeroCarteirinha?: string;
  plano?: string;
  nomeTitular?: string;
  cns?: string;
  ansCode?: string;
}

export class UnimedExtractor {
  /**
   * Extrai número da carteirinha específico da Unimed
   * Padrão comum: 0 994 910825083001 5 (formato fragmentado)
   */
  extractCardNumber(text: string): string | null {
    console.log('🔍 Unimed: Extraindo número da carteirinha...');
    
    // Remover CNS conhecido do texto para análise
    const cnsNumber = CNSValidator.extractCNS(text);
    let workingText = text;
    if (cnsNumber) {
      workingText = text.replace(new RegExp(cnsNumber, 'g'), '');
    }
    
    // Padrões específicos da Unimed
    const unimedPatterns = [
      // Padrão fragmentado: 0 994 910825083001 5
      /(\d{1})\s+(\d{3})\s+(\d{12})\s+(\d{1})/,
      // Padrão compacto: números longos de 17 dígitos
      /\b(\d{17})\b/,
      // Padrão após contexto específico
      /(?:CART[ÃA]O|CARTEIRINHA|BENEFICI[AÁ]RIO)[:\s]*(\d{15,18})/i,
      // Números longos sem fragmentação
      /\b(\d{15,18})\b/,
    ];

    for (const pattern of unimedPatterns) {
      const match = workingText.match(pattern);
      if (match) {
        let candidateNumber: string;
        
        // Se for o padrão fragmentado, concatenar todos os grupos
        if (match[1] && match[2] && match[3] && match[4]) {
          candidateNumber = match[1] + match[2] + match[3] + match[4];
          console.log(`🔍 Unimed: Número fragmentado encontrado: ${match[1]} ${match[2]} ${match[3]} ${match[4]} → ${candidateNumber}`);
        } else {
          candidateNumber = match[1];
          console.log(`🔍 Unimed: Número encontrado: ${candidateNumber}`);
        }
        
        // Validar que não é CNS e tem tamanho apropriado
        if (candidateNumber.length >= 15 && candidateNumber.length <= 18 && !CNSValidator.isCNSNumber(candidateNumber)) {
          console.log(`✅ Unimed: Número da carteirinha encontrado: ${candidateNumber}`);
          return candidateNumber;
        }
      }
    }

    console.log('❌ Unimed: Número da carteirinha não encontrado');
    return null;
  }

  /**
   * Extrai CNS usando utilitário global
   */
  extractCNS(text: string): string | null {
    console.log('🔍 Unimed: Extraindo CNS...');
    const cns = CNSValidator.extractCNS(text);
    if (cns) {
      console.log(`✅ Unimed: CNS extraído: ${cns}`);
    } else {
      console.log('❌ Unimed: CNS não encontrado');
    }
    return cns;
  }

  /**
   * Extrai plano específico da Unimed
   * Padrões: ICOMM GROUP, CORPORATIVO COMPACTO, etc.
   */
  extractPlan(text: string): string | null {
    console.log('🔍 Unimed: Extraindo plano...');
    
    const normalizedText = text.toUpperCase();
    
    // Padrões específicos da Unimed
    const unimedPlanPatterns = [
      // Planos específicos mencionados
      /ICOMM\s+GROUP\s+CORPORATIVO\s+COMPACTO\s+ENF\s+CP/,
      /ICOMM\s+GROUP/,
      /CORPORATIVO\s+COMPACTO/,
      // Padrões gerais da Unimed
      /UNIMED\s+([A-Z\s]{3,30})/,
      /PLANO\s+([A-Z\s]{3,30})/,
      /COBERTURA\s+([A-Z\s]{3,30})/,
      // Padrões comuns
      /EMPRESARIAL/,
      /INDIVIDUAL/,
      /FAMILIAR/,
      /EXECUTIVO/,
      /BASICO/,
      /ESPECIAL/,
      /PREMIUM/,
      /VIP/,
    ];

    for (const pattern of unimedPlanPatterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        const planName = match[0].trim();
        console.log(`✅ Unimed: Plano encontrado: ${planName}`);
        return planName;
      }
    }

    console.log('❌ Unimed: Plano não encontrado');
    return null;
  }

  /**
   * Extrai nome do titular específico da Unimed
   */
  extractHolderName(text: string): string | null {
    console.log('🔍 Unimed: Extraindo nome do titular...');
    
    const namePatterns = [
      // Após palavras-chave específicas
      /(?:TITULAR|BENEFICI[AÁ]RIO|NOME)[:\s]+([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-záàãâéêíóôõúç\s]{2,40})/i,
      /(?:PACIENTE|CLIENTE)[:\s]+([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-záàãâéêíóôõúç\s]{2,40})/i,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && this.isValidName(match[1])) {
        console.log(`✅ Unimed: Nome do titular encontrado: ${match[1]}`);
        return match[1].trim();
      }
    }

    console.log('❌ Unimed: Nome do titular não encontrado');
    return null;
  }

  /**
   * Calcula confiança específica para Unimed
   */
  getConfidence(data: InsuranceExtractedData): number {
    let confidence = 0;
    let factors = 0;

    // Operadora identificada (peso 3)
    if (data.operadora === 'UNIMED') {
      confidence += 3;
    }
    factors += 3;

    // Número da carteirinha (peso 3)
    if (data.numeroCarteirinha && data.numeroCarteirinha.length >= 15) {
      confidence += 3;
    }
    factors += 3;

    // Plano identificado (peso 2)
    if (data.plano) {
      confidence += 2;
    }
    factors += 2;

    // CNS identificado (peso 1)
    if (data.cns) {
      confidence += 1;
    }
    factors += 1;

    // Código ANS identificado (peso 1)
    if (data.ansCode) {
      confidence += 1;
    }
    factors += 1;

    return factors > 0 ? confidence / factors : 0;
  }

  /**
   * Valida se o texto extraído parece um nome válido
   */
  private isValidName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 50) return false;
    
    // Verificar se contém pelo menos duas palavras
    const words = name.trim().split(/\s+/);
    if (words.length < 2) return false;
    
    // Verificar se não contém números ou caracteres especiais inválidos
    if (/\d|[^\w\sÀ-ÿ]/.test(name)) return false;
    
    // Verificar se não são palavras-chave do sistema
    const invalidKeywords = ['UNIMED', 'CARTEIRINHA', 'PLANO', 'ANS', 'VIGENCIA', 'VALIDO'];
    const upperName = name.toUpperCase();
    if (invalidKeywords.some(keyword => upperName.includes(keyword))) return false;
    
    return true;
  }
}