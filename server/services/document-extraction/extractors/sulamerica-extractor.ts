import { CNSValidator } from '../utils/cns-validator';

/**
 * Extrator específico para carteirinhas Sul América
 * Padrão: 17 dígitos começando com 888 ou 8888
 */
export class SulAmericaExtractor {
  
  extractCardNumber(text: string): string | null {
    console.log('🔍 Sul América: Extraindo número da carteirinha...');
    
    const patterns = [
      /\b(8{4,5}[\s]*\d{4}[\s]*\d{4}[\s]*\d{4})\b/,
      /\b(8{3,4}\d{13,14})\b/,
      /(?:Cartão|Carteirinha|Número)[\s:]*(\d{17})/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let numero = match[1].replace(/\s/g, '');
        if (/^8{3,4}\d{13,14}$/.test(numero) && numero.length === 17) {
          console.log('✅ Sul América: Número encontrado:', numero);
          return numero;
        }
      }
    }
    
    console.log('❌ Sul América: Número da carteirinha não encontrado');
    return null;
  }
  
  extractPlan(text: string): string | null {
    console.log('🔍 Sul América: Extraindo plano...');
    
    const planPatterns = [
      /(?:PLANO|PRODUTO)[\s:]*([A-Z][A-Z\s]*(?:EXACT|TRADICIONAL|PREMIUM|EXECUTIVO|MASTER)[A-Z\s]*)/i,
      /(?:SULAMERICA\s+)?([A-Z\s]*(?:EXACT|TRADICIONAL|PREMIUM|EXECUTIVO|MASTER)[A-Z\s]*)/i,
      /PLANO[\s:]*([A-Z\s]+)/i
    ];
    
    for (const pattern of planPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let planName = match[1].trim();
        planName = planName.replace(/^SULAMERICA\s+/i, '').trim();
        
        if (planName.length >= 3) {
          console.log('✅ Sul América: Plano encontrado:', planName);
          return planName;
        }
      }
    }
    
    console.log('❌ Sul América: Plano não encontrado');
    return null;
  }
  
  extractHolderName(text: string): string | null {
    console.log('🔍 Sul América: Extraindo nome do titular...');
    
    const namePatterns = [
      /(?:NOME|TITULAR|BENEFICIÁRIO)[\s:]*([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]{3,50})/i,
      /^([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]{10,50})$/m
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        const invalidWords = ['SULAMERICA', 'SAUDE', 'PLANO', 'CARTAO'];
        if (!invalidWords.some(word => name.toUpperCase().includes(word))) {
          console.log('✅ Sul América: Nome encontrado:', name);
          return name;
        }
      }
    }
    
    console.log('❌ Sul América: Nome do titular não encontrado');
    return null;
  }
  
  extractCNS(text: string): string | null {
    return CNSValidator.extractCNS(text);
  }

  getConfidence(data: { numeroCarteirinha?: string; operadora?: string; plano?: string; nomeTitular?: string }): number {
    let score = 0;
    let factors = 0;
    
    if (data.numeroCarteirinha && /^8{3,4}\d{13,14}$/.test(data.numeroCarteirinha)) {
      score += 0.4;
    }
    factors++;
    
    if (data.operadora?.toUpperCase().includes('SULAMERICA')) {
      score += 0.3;
    }
    factors++;
    
    if (data.plano) {
      score += 0.2;
    }
    factors++;
    
    if (data.nomeTitular) {
      score += 0.1;
    }
    factors++;
    
    return factors > 0 ? score : 0;
  }
}
