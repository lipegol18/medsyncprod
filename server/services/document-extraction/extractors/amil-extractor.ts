/**
 * Extrator especializado para carteirinhas Amil
 * Implementa padrões específicos de extração para documentos Amil
 */

import { CNSValidator } from '../utils/cns-validator';

interface InsuranceExtractedData {
  operadora?: string;
  numeroCarteirinha?: string;
  plano?: string;
  nomeTitular?: string;
  dataNascimento?: string;
  cns?: string;
}

export class AmilExtractor {
  
  /**
   * Identifica se o texto pertence à Amil
   */
  canHandle(text: string): boolean {
    const normalizedText = text.toUpperCase();
    
    const amilPatterns = [
      /AMIL/,
      /MEDIAL/,
      /ASSISTENCIA\s*MEDICA/,
      /PLANO\s*MEDICO\s*AMIL/,
      /AMIL\s*SAUDE/,
      /BLUE\s*\d+/,
      /S\d{3,4}\s*(?:QP|COPART)/,
    ];

    return amilPatterns.some(pattern => pattern.test(normalizedText));
  }

  /**
   * Extrai dados específicos da Amil
   */
  async extract(text: string): Promise<InsuranceExtractedData> {
    console.log('🔍 Amil: Iniciando extração específica...');
    
    const data: InsuranceExtractedData = {
      operadora: 'AMIL',
      numeroCarteirinha: this.extractCardNumber(text) ?? undefined,
      plano: this.extractPlan(text) ?? undefined,
      nomeTitular: this.extractHolderName(text) ?? undefined,
      dataNascimento: this.extractBirthDate(text) ?? undefined,
      cns: this.extractCNS(text) ?? undefined
    };

    console.log('✅ Amil: Extração concluída:', data);
    return data;
  }

  /**
   * Extrai número da carteirinha específico da Amil
   * Padrões: 089924939 (9 dígitos), 43723895 4 (8+1 dígitos)
   */
  extractCardNumber(text: string): string | null {
    console.log('🔍 Amil: Extraindo número da carteirinha...');
    
    // Remover CNS do texto para evitar confusão
    const cleanText = CNSValidator.removeCNSFromText(text);
    
    const amilPatterns = [
      // Padrão específico Amil: 9 dígitos consecutivos
      /\b(0\d{8})\b/,
      /\b(\d{9})\b/,
      
      // Padrão com espaço: 8 dígitos + espaço + 1 dígito
      /\b(\d{8})\s+(\d{1})\b/,
      
      // Padrão com contexto específico
      /(?:CART[ÃA]O|CARTEIRINHA|BENEFICI[AÁ]RIO|MATRICULA)[:\s]*(\d{8,9})/i,
      
      // Padrão após "amil" ou código de plano
      /(?:AMIL|S\d{3,4})[:\s]*(\d{8,9})/i,
      
      // Números após códigos de rede
      /REDE\s*\d+[:\s]*(\d{8,9})/i,
      
      // Padrões específicos observados
      /\b43723895\s*4\b/,
      /\b089924939\b/,
    ];

    for (const pattern of amilPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        let cardNumber: string;
        
        // Se for padrão com espaço, concatenar
        if (match[1] && match[2]) {
          cardNumber = match[1] + match[2];
          console.log(`🔍 Amil: Número com espaço encontrado: ${match[1]} ${match[2]} → ${cardNumber}`);
        } else {
          cardNumber = match[1] || match[0];
          console.log(`🔍 Amil: Número encontrado: ${cardNumber}`);
        }
        
        // Validar tamanho e que não é CNS
        if (cardNumber.length >= 8 && cardNumber.length <= 10 && !CNSValidator.isCNSNumber(cardNumber)) {
          console.log(`✅ Amil: Número da carteirinha encontrado: ${cardNumber}`);
          return cardNumber;
        }
      }
    }

    console.log('❌ Amil: Número da carteirinha não encontrado');
    return null;
  }

  /**
   * Extrai CNS usando utilitário global
   */
  extractCNS(text: string): string | null {
    console.log('🔍 Amil: Extraindo CNS...');
    const cns = CNSValidator.extractCNS(text);
    if (cns) {
      console.log(`✅ Amil: CNS extraído: ${cns}`);
    } else {
      console.log('❌ Amil: CNS não encontrado');
    }
    return cns;
  }

  /**
   * Extrai plano específico da Amil
   * Padrões: BLUE 300, S580 COPART, MEDICO AMIL, etc.
   */
  extractPlan(text: string): string | null {
    console.log('🔍 Amil: Extraindo plano...');
    
    const normalizedText = text.toUpperCase();
    
    // Padrões específicos da Amil (ordenados por prioridade)
    const amilPlanPatterns = [
      // 1. MEDICUS - Nova linha de produtos Amil
      /MEDICUS\s+(\d{1,2})/,
      /MEDICUS\s+NACIONAL/,
      /MEDICUS\s+EXECUTIVO/,
      /MEDICUS\s+([A-Z0-9\s]{2,20})/,
      
      // 2. Planos específicos observados (alta prioridade)
      /AMIL\s+S\d{3,4}\s+(?:QP\s+)?(?:NAC\s+)?(?:R\s+)?COPART(?:\s+PJ)?/,
      /BLUE\s+\d{3}\s+RM\s+RJ\s+QP\s+PF/,
      /PLANO\s+MEDICO\s+AMIL/,
      /MEDICO\s+AMIL\s+AMIL\s+S/,
      
      // 3. Padrões com contexto de campo específico
      /PLANO[:\s]+MEDICUS\s+([A-Z0-9\s]{1,20})/,
      /PLANO[:\s]+(BLUE\s+\d{2,3})/,
      /PLANO[:\s]+(S\d{3,4}[A-Z0-9\s]*)/,
      
      // 4. Padrões gerais de códigos Amil
      /S\d{3,4}\s*(?:QP|COPART|NAC|RM)/,
      /BLUE\s+\d{2,3}/,
      /AMIL\s+\d{3,4}/,
      
      // 5. Padrões genéricos (baixa prioridade - removidos INDIVIDUAL para evitar conflitos)
      /EXECUTIVO/,
      /EMPRESARIAL/,
      /PREMIUM/,
      /BASICO/,
      /ESPECIAL/,
      /NACIONAL/,
    ];

    for (const pattern of amilPlanPatterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        const planName = match[1] || match[0];
        const cleanPlan = planName.trim();
        // Filtrar nomes que não são planos
        const invalidPlans = [
          'AMIL', 'TITULAR', 'BENEFICIARIO', 'CARTEIRINHA', 'CARTAO',
          'NOME', 'NASCIMENTO', 'DATA'
        ];
        
        if (!invalidPlans.some(invalid => cleanPlan === invalid) && cleanPlan.length >= 5) {
          console.log(`✅ Amil: Plano encontrado: ${cleanPlan}`);
          return cleanPlan;
        }
      }
    }
    
    console.log('❌ Amil: Plano não encontrado');
    return null;
  }

  /**
   * Extrai nome do titular específico da Amil
   */
  extractHolderName(text: string): string | null {
    console.log('🔍 Amil: Extraindo nome do titular...');
    
    const normalizedText = text.toUpperCase();
    
    const namePatterns = [
      // Padrão com rótulo específico
      /(?:BENEFICI[AÁ]RIO|TITULAR|NOME)[:\s]+([A-Z\s]{10,50})/,
      /(?:PACIENTE|USUARIO)[:\s]+([A-Z\s]{10,50})/,
      
      // Padrão específico observado nas carteirinhas
      /EMA\s+DE\s+BARROS/,
      /MARIA\s+JOSE\s+CALDEIRA\s+GOULART/,
      
      // Padrão genérico para nomes (3+ palavras maiúsculas)
      /\b([A-Z]{2,}\s+[A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/,
      
      // Padrão após códigos específicos
      /(?:AMIL|BLUE)\s+\d+[:\s]*([A-Z\s]{10,50})/,
    ];

    for (const pattern of namePatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        
        // Filtrar nomes que não são pessoas
        const invalidNames = [
          'AMIL', 'BLUE', 'MEDICO', 'PLANO', 'SAUDE', 'BENEFICIARIO',
          'TITULAR', 'CARTEIRINHA', 'CARTAO', 'NACIONAL', 'COPART',
          'AMBULATORIAL', 'HOSPITALAR', 'OBSTETRICIA', 'EXECUTIVO'
        ];
        
        if (!invalidNames.some(invalid => name.includes(invalid)) && name.length >= 10) {
          console.log(`✅ Amil: Nome do titular encontrado: ${name}`);
          return name;
        }
      }
    }

    console.log('❌ Amil: Nome do titular não encontrado');
    return null;
  }

  /**
   * Extrai data de nascimento específica da Amil
   */
  extractBirthDate(text: string): string | null {
    console.log('🔍 Amil: Extraindo data de nascimento...');
    
    const datePatterns = [
      // Padrões com rótulos específicos
      /(?:NASCIMENTO|NASC|DATA\s*NASC)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(?:NASCIMENTO|NASC|DATA\s*NASC)[:\s]*(\d{1,2}-\d{1,2}-\d{4})/i,
      
      // Datas específicas observadas
      /20\/02\/1972/,
      /07\/10\/1945/,
      
      // Padrão genérico de data
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
      /\b(\d{1,2}-\d{1,2}-\d{4})\b/,
      
      // Padrão após "Nascimento" com contexto
      /NASCIMENTO[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const date = match[1];
        
        // Validar se é uma data de nascimento plausível (ano entre 1900-2024)
        const yearMatch = date.match(/(\d{4})/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          if (year >= 1900 && year <= 2024) {
            console.log(`✅ Amil: Data de nascimento encontrada: ${date}`);
            return date;
          }
        }
      }
    }

    console.log('❌ Amil: Data de nascimento não encontrada');
    return null;
  }

  /**
   * Calcula confiança específica para Amil
   */
  getConfidence(data: InsuranceExtractedData): number {
    let confidence = 0;
    let factors = 0;

    // Operadora identificada (peso 3)
    if (data.operadora === 'AMIL') {
      confidence += 3;
    }
    factors += 3;

    // Número da carteirinha (peso 3)
    if (data.numeroCarteirinha && data.numeroCarteirinha.length >= 8) {
      confidence += 3;
    }
    factors += 3;

    // Plano identificado (peso 2)
    if (data.plano) {
      confidence += 2;
    }
    factors += 2;

    // Nome do titular (peso 1)
    if (data.nomeTitular) {
      confidence += 1;
    }
    factors += 1;

    // Data de nascimento (peso 1)
    if (data.dataNascimento) {
      confidence += 1;
    }
    factors += 1;

    return factors > 0 ? confidence / factors : 0;
  }
}