/**
 * Extrator dedicado para CNH Clássica (modelo antigo)
 * Layout: Labels em linhas separadas, seção "OBSERVAÇÕES", formato tradicional
 * Usado para CNHs emitidas antes de ~2022
 */

import { IIdentityExtractor, ExtractedIdentityData } from './identity-extractor-interface';
import { matchLabel } from '../utils/fuzzy-label-matcher';

export interface CNHSpecificData {
  categoria?: string;
  validade?: string;
  primeiraHabilitacao?: string;
  registroCNH?: string;
  espelhoCNH?: string;
  observacoes?: string;
}

export class CNHClassicExtractor implements IIdentityExtractor {
  
  canHandle(text: string): boolean {
    const normalizedText = text.toUpperCase();
    
    const cnhPatterns = [
      /CARTEIRA NACIONAL DE HABILITAÇÃO/,
      /CARTEIRA\s+NACIONAL\s+DE\s+HABILITA/,
      /CNH/,
      /PERMISSÃO PARA DIRIGIR/,
      /CATEGORIA\s*[:\s]*[A-E]/,
      /1ª HABILITAÇÃO/,
      /PRIMEIRA HABILITAÇÃO/,
      /DETRAN/,
      /ACC\s*[:\s]*(SIM|NÃO)/i,
      /VALIDADE\s*[:\s]*\d{2}\/\d{2}\/\d{4}/
    ];
    
    const matches = cnhPatterns.filter(pattern => pattern.test(normalizedText)).length;
    return matches >= 2;
  }
  
  async extract(text: string): Promise<ExtractedIdentityData> {
    console.log('🚗 CNH Extractor: Iniciando extração...');
    
    const data: ExtractedIdentityData = {
      fullName: this.extractFullName(text) || undefined,
      rg: this.extractRG(text) || undefined,
      cpf: this.extractCPF(text) || undefined,
      birthDate: this.extractBirthDate(text) || undefined,
      filiation: this.extractFiliation(text) || undefined,
      birthPlace: this.extractBirthPlace(text) || undefined,
      issuedDate: this.extractIssuedDate(text) || undefined,
      issuedBy: 'DETRAN',
    };
    
    const cnhSpecific = this.extractCNHSpecificData(text);
    
    console.log('🚗 CNH Extractor: Dados extraídos:', data);
    console.log('🚗 CNH Extractor: Dados específicos CNH:', cnhSpecific);
    
    return { ...data, ...cnhSpecific };
  }
  
  extractFullName(text: string): string | null {
    console.log('🔍 CNH: Extraindo nome...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Estratégia 1: Busca linha-por-linha com fuzzy matching
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineClean = line.replace(/[:\-\s]/g, '').toUpperCase();
      
      // Verificar se é o label "NOME" (com fuzzy matching)
      // Inclui variantes OCR comuns: "OME", "ONE", "NOME-", "NOME"
      const isNomeLabel = matchLabel(line, "NOME") || 
                          matchLabel(lineClean, "NOME") ||
                          lineClean === "OME" ||      // OCR falhou "N" → vazio
                          lineClean === "ONE" ||      // OCR falhou "M" → "N" e perdeu "N"
                          lineClean === "NOM" ||      // OCR falhou "E"
                          lineClean === "NOWE" ||     // OCR falhou "M" → "W"
                          /^NOME[\-\s]*$/i.test(line); // NOME- ou NOME com traço
      
      if (isNomeLabel) {
        console.log(`🚗 [CNH] Label "Nome" encontrado na linha ${i}: "${line}"`);
        
        // Verificar se o nome está na mesma linha (após o label)
        const inlineMatch = line.match(/^NOME\s*:?\s*(.+)$/i);
        if (inlineMatch && inlineMatch[1]) {
          const candidateName = this.cleanName(inlineMatch[1]);
          if (this.isValidName(candidateName)) {
            console.log('✅ CNH: Nome encontrado inline:', candidateName);
            return candidateName;
          }
        }
        
        // Procurar nome nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (this.isValidName(nextLine)) {
            console.log('✅ CNH: Nome encontrado após label:', nextLine);
            return nextLine;
          }
        }
      }
    }
    
    // Estratégia 2: Padrões regex (fallback)
    const nomePatterns = [
      /NOME[:\s]*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+?)(?:\s+(?:DOC|RG|CPF|FILIAÇÃO|DATA|NASCIMENTO|\d))/i,
      /^([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{2,})+)$/m,
    ];
    
    for (const pattern of nomePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const candidateName = this.cleanName(match[1]);
        if (this.isValidName(candidateName)) {
          console.log('✅ CNH: Nome encontrado via regex:', candidateName);
          return candidateName;
        }
      }
    }
    
    console.log('❌ CNH: Nome não encontrado');
    return null;
  }
  
  extractCPF(text: string): string | null {
    console.log('🔍 CNH: Extraindo CPF...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Estratégia 1: Busca linha-por-linha com fuzzy matching
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (matchLabel(line, "CPF") || line.toUpperCase().startsWith("CPF")) {
        console.log(`🚗 [CNH] Label "CPF" encontrado na linha ${i}: "${line}"`);
        
        // Verificar se CPF está na mesma linha
        const inlineMatch = line.match(/CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2})/i);
        if (inlineMatch && inlineMatch[1]) {
          const cpf = inlineMatch[1].replace(/[^\d]/g, '');
          if (cpf.length === 11 && this.isValidCPF(cpf)) {
            const formatted = this.formatCPF(cpf);
            console.log('✅ CNH: CPF encontrado inline:', formatted);
            return formatted;
          }
        }
        
        // Procurar CPF nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          const cpfMatch = nextLine.match(/(\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2})/);
          if (cpfMatch) {
            const cpf = cpfMatch[1].replace(/[^\d]/g, '');
            if (cpf.length === 11 && this.isValidCPF(cpf)) {
              const formatted = this.formatCPF(cpf);
              console.log('✅ CNH: CPF encontrado após label:', formatted);
              return formatted;
            }
          }
        }
      }
    }
    
    // Estratégia 2: Padrões regex (fallback)
    const cpfPatterns = [
      /CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2})/i,
      /(\d{3}\.\d{3}\.\d{3}[-.]?\d{2})/,
    ];
    
    for (const pattern of cpfPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const cpf = match[1].replace(/[^\d]/g, '');
        if (cpf.length === 11 && this.isValidCPF(cpf)) {
          const formatted = this.formatCPF(cpf);
          console.log('✅ CNH: CPF encontrado via regex:', formatted);
          return formatted;
        }
      }
    }
    
    // Fallback: buscar qualquer sequência de 11 dígitos e validar
    const allDigitSequences = text.match(/\d{11,}/g) || [];
    for (const seq of allDigitSequences) {
      const cpf = seq.substring(0, 11);
      if (this.isValidCPF(cpf)) {
        const formatted = this.formatCPF(cpf);
        console.log('✅ CNH: CPF encontrado via fallback:', formatted);
        return formatted;
      }
    }
    
    console.log('❌ CNH: CPF não encontrado');
    return null;
  }
  
  extractRG(text: string): string | null {
    console.log('🔍 CNH: Extraindo RG...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Estratégia 1: Busca linha-por-linha com fuzzy matching
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineUpper = line.toUpperCase();
      
      // Labels possíveis: RG, DOC. IDENTIDADE, IDENTIDADE
      if (matchLabel(line, "RG") || 
          matchLabel(lineUpper, "IDENTIDADE") || 
          lineUpper.includes("DOC. IDENTIDADE") ||
          lineUpper.includes("DOC IDENTIDADE")) {
        console.log(`🚗 [CNH] Label "RG/Identidade" encontrado na linha ${i}: "${line}"`);
        
        // Verificar se RG está na mesma linha
        const inlineMatch = line.match(/(\d{1,3}\.?\d{3}\.?\d{3}[-.]?\d?)/);
        if (inlineMatch && inlineMatch[1]) {
          const rg = inlineMatch[1].replace(/[^\d]/g, '');
          if (rg.length >= 7 && rg.length <= 10) {
            console.log('✅ CNH: RG encontrado inline:', inlineMatch[1]);
            return inlineMatch[1];
          }
        }
        
        // Procurar RG nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          const rgMatch = nextLine.match(/(\d{1,3}\.?\d{3}\.?\d{3}[-.]?\d?)/);
          if (rgMatch) {
            const rg = rgMatch[1].replace(/[^\d]/g, '');
            if (rg.length >= 7 && rg.length <= 10) {
              console.log('✅ CNH: RG encontrado após label:', rgMatch[1]);
              return rgMatch[1];
            }
          }
        }
      }
    }
    
    // Estratégia 2: Padrões regex (fallback)
    const rgPatterns = [
      /(?:DOC\.?\s*IDENTIDADE|RG|IDENTIDADE)[:\s]*(\d{1,3}\.?\d{3}\.?\d{3}[-.]?\d?)/i,
      /RG[:\s]*(\d{7,10})/i,
    ];
    
    for (const pattern of rgPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const rg = match[1].replace(/[^\d]/g, '');
        if (rg.length >= 7 && rg.length <= 10) {
          console.log('✅ CNH: RG encontrado via regex:', match[1]);
          return match[1];
        }
      }
    }
    
    console.log('❌ CNH: RG não encontrado');
    return null;
  }
  
  extractBirthDate(text: string): string | null {
    console.log('🔍 CNH: Extraindo data de nascimento...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Estratégia 1: Busca linha-por-linha com fuzzy matching
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineUpper = line.toUpperCase();
      
      // Labels possíveis: DATA NASCIMENTO, NASCIMENTO, NASC
      if (matchLabel(lineUpper, "NASCIMENTO") || 
          lineUpper.includes("DATA NASCIMENTO") ||
          lineUpper.includes("DATA DE NASCIMENTO") ||
          matchLabel(lineUpper, "NASC")) {
        console.log(`🚗 [CNH] Label "Nascimento" encontrado na linha ${i}: "${line}"`);
        
        // Verificar se data está na mesma linha
        const inlineMatch = line.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
        if (inlineMatch && inlineMatch[1]) {
          const formatted = this.formatDate(inlineMatch[1]);
          console.log('✅ CNH: Data de nascimento encontrada inline:', formatted);
          return formatted;
        }
        
        // Procurar data nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          const dateMatch = nextLine.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
          if (dateMatch) {
            const formatted = this.formatDate(dateMatch[1]);
            console.log('✅ CNH: Data de nascimento encontrada após label:', formatted);
            return formatted;
          }
        }
      }
    }
    
    // Estratégia 2: Padrões regex (fallback)
    const datePatterns = [
      /DATA\s*(?:DE\s*)?NASCIMENTO[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
      /NASCIMENTO[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
      /NASC\.?[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const formatted = this.formatDate(match[1]);
        console.log('✅ CNH: Data de nascimento encontrada via regex:', formatted);
        return formatted;
      }
    }
    
    console.log('❌ CNH: Data de nascimento não encontrada');
    return null;
  }
  
  extractFiliation(text: string): { mother?: string; father?: string } | null {
    console.log('🔍 CNH: Extraindo filiação...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let mother: string | undefined;
    let father: string | undefined;
    
    // Estratégia 1: Busca linha-por-linha com fuzzy matching
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineUpper = line.toUpperCase();
      
      // Buscar MÃE/MAE
      if (matchLabel(lineUpper, "MAE") || matchLabel(lineUpper, "MÃE") || lineUpper.includes("FILIAÇÃO")) {
        console.log(`🚗 [CNH] Label "Filiação/Mãe" encontrado na linha ${i}: "${line}"`);
        
        // Verificar se nome está na mesma linha
        const inlineMatch = line.match(/(?:MÃE|MAE|FILIAÇÃO)[:\s]*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+)/i);
        if (inlineMatch && inlineMatch[1]) {
          mother = this.cleanName(inlineMatch[1]);
          console.log('✅ CNH: Mãe encontrada inline:', mother);
        } else {
          // Procurar nas próximas linhas
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const nextLine = lines[j].trim();
            if (this.isValidName(nextLine) && !nextLine.toUpperCase().includes("PAI")) {
              mother = this.cleanName(nextLine);
              console.log('✅ CNH: Mãe encontrada após label:', mother);
              break;
            }
          }
        }
      }
      
      // Buscar PAI
      if (matchLabel(lineUpper, "PAI")) {
        console.log(`🚗 [CNH] Label "Pai" encontrado na linha ${i}: "${line}"`);
        
        // Verificar se nome está na mesma linha
        const inlineMatch = line.match(/(?:PAI)[:\s]*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+)/i);
        if (inlineMatch && inlineMatch[1]) {
          father = this.cleanName(inlineMatch[1]);
          console.log('✅ CNH: Pai encontrado inline:', father);
        } else {
          // Procurar nas próximas linhas
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const nextLine = lines[j].trim();
            if (this.isValidName(nextLine)) {
              father = this.cleanName(nextLine);
              console.log('✅ CNH: Pai encontrado após label:', father);
              break;
            }
          }
        }
      }
    }
    
    // Estratégia 2: Padrões regex (fallback)
    if (!mother) {
      const maeMatch = text.match(/(?:MÃE|MAE|FILIAÇÃO)[:\s]*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+?)(?:\n|PAI|$)/i);
      if (maeMatch && maeMatch[1]) {
        mother = this.cleanName(maeMatch[1]);
        console.log('✅ CNH: Mãe encontrada via regex:', mother);
      }
    }
    
    if (!father) {
      const paiMatch = text.match(/(?:PAI)[:\s]*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+?)(?:\n|$)/i);
      if (paiMatch && paiMatch[1]) {
        father = this.cleanName(paiMatch[1]);
        console.log('✅ CNH: Pai encontrado via regex:', father);
      }
    }
    
    if (mother || father) {
      console.log('✅ CNH: Filiação encontrada - Mãe:', mother, 'Pai:', father);
      return { mother, father };
    }
    
    console.log('❌ CNH: Filiação não encontrada');
    return null;
  }
  
  extractBirthPlace(text: string): string | null {
    const patterns = [
      /(?:LOCAL\s*(?:DE\s*)?NASCIMENTO|NATURALIDADE)[:\s]*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s\-\/]+?)(?:\n|DATA|CPF|$)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const place = match[1].trim();
        if (place.length > 2 && place.length < 50) {
          console.log('✅ CNH: Local de nascimento encontrado:', place);
          return place;
        }
      }
    }
    
    return null;
  }
  
  extractCNHSpecificData(text: string): CNHSpecificData {
    const cnhData: CNHSpecificData = {};
    
    const categoriaPatterns = [
      /CATEGORIA[:\s]*([A-E]{1,2}(?:[\s,\/]+[A-E])*)/i,
      /CATEGORIA[:\s]*(ACC(?:[\s,\/]+[A-E])?)/i,
      /CATEGORIA[:\s]*([A-E](?:[\s,\/]*ACC)?)/i,
      /CAT\.?[:\s]*([A-E]{1,2}|ACC(?:[\s,\/]*[A-E])?)/i,
      /(ACC|PPD)/i,
    ];
    
    for (const pattern of categoriaPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        cnhData.categoria = match[1].replace(/[\s,]/g, '').replace(/\//g, '/').toUpperCase();
        console.log('✅ CNH: Categoria encontrada:', cnhData.categoria);
        break;
      }
    }
    
    const validadePatterns = [
      /VALIDADE[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
      /VAL\.?[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
      /VÁLIDO ATÉ[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
    ];
    
    for (const pattern of validadePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        cnhData.validade = this.formatDate(match[1]);
        console.log('✅ CNH: Validade encontrada:', cnhData.validade);
        break;
      }
    }
    
    const primeiraHabPatterns = [
      /(?:1ª|PRIMEIRA)\s*HABILITAÇÃO[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
      /(?:1ª|PRIMEIRA)\s*HAB\.?[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
      /PRIM\.?\s*HAB\.?[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
    ];
    
    for (const pattern of primeiraHabPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        cnhData.primeiraHabilitacao = this.formatDate(match[1]);
        console.log('✅ CNH: Primeira habilitação encontrada:', cnhData.primeiraHabilitacao);
        break;
      }
    }
    
    const registroMatch = text.match(/(?:N[°º]?\s*)?REGISTRO[:\s]*(\d{9,11})/i);
    if (registroMatch) {
      cnhData.registroCNH = registroMatch[1];
      console.log('✅ CNH: Registro CNH encontrado:', cnhData.registroCNH);
    }
    
    const espelhoMatch = text.match(/ESPELHO[:\s]*(\d{10,12})/i);
    if (espelhoMatch) {
      cnhData.espelhoCNH = espelhoMatch[1];
      console.log('✅ CNH: Espelho CNH encontrado:', cnhData.espelhoCNH);
    }
    
    const obsMatch = text.match(/(?:OBS\.?|OBSERVA[ÇC][ÕO]ES?)[:\s]*([^\n]+)/i);
    if (obsMatch) {
      cnhData.observacoes = obsMatch[1].trim();
      console.log('✅ CNH: Observações encontradas:', cnhData.observacoes);
    }
    
    return cnhData;
  }
  
  private extractIssuedDate(text: string): string | null {
    const patterns = [
      /DATA\s*(?:DE\s*)?EMISSÃO[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
      /EMISSÃO[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return this.formatDate(match[1]);
      }
    }
    
    return null;
  }
  
  private cleanName(name: string): string {
    return name
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]/gi, '')
      .trim()
      .toUpperCase();
  }
  
  private isValidName(text: string): boolean {
    if (!text || text.length < 5 || text.length > 60) return false;
    
    const invalidWords = /CARTEIRA|NACIONAL|HABILITAÇÃO|DETRAN|REGISTRO|CATEGORIA|VALIDADE|PERMISSÃO|DIRIGIR|REPÚBLICA|BRASIL/i;
    if (invalidWords.test(text)) return false;
    
    const words = text.trim().split(/\s+/);
    if (words.length < 2) return false;
    
    return /^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]+$/i.test(text);
  }
  
  private isValidCPF(cpf: string): boolean {
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  }
  
  private formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  private formatDate(date: string): string {
    return date.replace(/[\-\.]/g, '/');
  }
  
  getConfidence(data: ExtractedIdentityData): number {
    let score = 0;
    let total = 0;
    
    if (data.fullName) score += 3;
    total += 3;
    
    if (data.cpf) score += 3;
    total += 3;
    
    if (data.rg) score += 2;
    total += 2;
    
    if (data.birthDate) score += 2;
    total += 2;
    
    const cnhData = data as ExtractedIdentityData & CNHSpecificData;
    if (cnhData.categoria) score += 2;
    total += 2;
    
    if (cnhData.validade) score += 1;
    total += 1;
    
    return total > 0 ? score / total : 0;
  }
}
