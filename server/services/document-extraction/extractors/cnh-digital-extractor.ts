/**
 * Extrator para CNH-e (CNH Digital)
 * 
 * A CNH-e é a versão digital da CNH que contém:
 * - Cabeçalho institucional (SENATRAN, gov.br, MINISTÉRIO DOS TRANSPORTES)
 * - Imagem da CNH (formato Modern)
 * - QR-Code para validação
 * - Zona MRZ (Machine Readable Zone) com dados codificados
 * 
 * Estratégia:
 * 1. Filtrar texto institucional (ruído)
 * 2. Extrair dados usando padrões do Modern
 * 3. Usar MRZ como fallback/validação
 */

import { IIdentityExtractor, ExtractedIdentityData } from './identity-extractor-interface';
import { CNHCommon } from './cnh-common';

export class CNHDigitalExtractor implements IIdentityExtractor {
  
  canHandle(text: string): boolean {
    const normalized = text.toUpperCase();
    
    const digitalMarkers = [
      /SENATRAN/i,
      /SECRETARIA\s*NACIONAL\s*DE\s*TR[ÂA]NSITO/i,
      /GOV\.?BR/i,
      /ASSINADOR\s*SERPRO/i,
      /SERPRO\.GOV\.BR/i,
      /DOCUMENTO\s*ASSINADO\s*COM\s*CERTIFICADO\s*DIGITAL/i,
      /MEDIDA\s*PROVIS[ÓO]RIA\s*N[°º]?\s*2200/i,
      /QR[\-\s]?CODE/i,
    ];
    
    const mrzPattern = /I<BRA[A-Z0-9<]{20,}/;
    
    let markerCount = 0;
    for (const pattern of digitalMarkers) {
      if (pattern.test(normalized)) {
        markerCount++;
      }
    }
    
    const hasMRZ = mrzPattern.test(normalized);
    
    return markerCount >= 2 || (markerCount >= 1 && hasMRZ);
  }
  
  /**
   * Filtra o texto removendo ruído institucional da CNH-e
   */
  private filterInstitutionalNoise(text: string): string {
    const linesToRemove = [
      /^.*REPÚBLICA\s*FEDERATIVA\s*DO\s*BRASIL.*$/gmi,
      /^.*MINIST[ÉE]RIO\s*DOS\s*TRANSPORTES.*$/gmi,
      /^.*SECRETARIA\s*NACIONAL\s*DE\s*TR[ÂA]NSITO.*$/gmi,
      /^.*SENATRAN.*$/gmi,
      /^.*GOV\.?BR.*$/gmi,
      /^.*QR[\-\s]?CODE.*$/gmi,
      /^.*DOCUMENTO\s*ASSINADO\s*COM\s*CERTIFICADO.*$/gmi,
      /^.*MEDIDA\s*PROVIS[ÓO]RIA.*$/gmi,
      /^.*ASSINADOR\s*SERPRO.*$/gmi,
      /^.*SERPRO\.GOV\.BR.*$/gmi,
      /^.*ORIENTA[ÇC][ÕO]ES\s*PARA\s*INSTALAR.*$/gmi,
      /^.*VALIDA[ÇC][ÃA]O\s*DO\s*DOCUMENTO.*$/gmi,
      /^.*SUA\s*VALIDADE\s*PODER[ÁA].*$/gmi,
      /^.*CONFIRMA[ÇC][ÃA]O\s*POR\s*MEIO.*$/gmi,
      /^.*HTTPS?:\/\/.*$/gmi,
      /^.*SERPRO\s*\/?\s*SENATRAN.*$/gmi,
      /^I<BRA.*$/gmi,
      /^\d{6}[MF]\d{6}BRA.*$/gmi,
      /^[A-Z]+<<[A-Z<]+$/gmi,
    ];
    
    let filtered = text;
    for (const pattern of linesToRemove) {
      filtered = filtered.replace(pattern, '');
    }
    
    filtered = filtered.replace(/\n{3,}/g, '\n\n');
    
    return filtered.trim();
  }
  
  /**
   * Extrai dados da zona MRZ (Machine Readable Zone)
   */
  private extractFromMRZ(text: string): { fullName?: string; birthDate?: string } {
    const result: { fullName?: string; birthDate?: string } = {};
    
    const mrzLines = text.match(/[A-Z0-9<]{30,44}/g) || [];
    
    console.log('📋 [CNH-Digital] Linhas MRZ encontradas:', mrzLines.length);
    
    for (const line of mrzLines) {
      if (/^\d{6}[MF]\d{6}BRA/.test(line)) {
        console.log('📋 [CNH-Digital] MRZ Linha 2 (datas/sexo):', line);
        
        const birthDateMatch = line.match(/^(\d{2})(\d{2})(\d{2})/);
        if (birthDateMatch) {
          const [, yy, mm, dd] = birthDateMatch;
          const year = parseInt(yy) > 50 ? `19${yy}` : `20${yy}`;
          result.birthDate = `${dd}/${mm}/${year}`;
          console.log('📋 [CNH-Digital] Data nascimento (MRZ):', result.birthDate);
        }
      }
      
      if (/^[A-Z]+<<[A-Z<]+$/.test(line) && !line.startsWith('I<')) {
        console.log('📋 [CNH-Digital] MRZ Linha 3 (nome):', line);
        
        const nameParts = line.replace(/</g, ' ').trim().split(/\s+/).filter(p => p.length > 0);
        if (nameParts.length >= 2) {
          result.fullName = nameParts.join(' ');
          console.log('📋 [CNH-Digital] Nome (MRZ):', result.fullName);
        }
      }
    }
    
    return result;
  }
  
  extractFullName(text: string): string | null {
    const filteredText = this.filterInstitutionalNoise(text);
    
    const namePatterns = [
      /(?:2\s*[eE]\s*1\s*)?(?:NOME(?:\s*E\s*SOBRENOME)?|ONE|OME|NOM|NOWE)\s*[:\-]?\s*\n?\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)/i,
      /NOME\s*E\s*SOBRENOME[:\s]*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)/i,
      /([A-Z][A-Z\s]{10,40})\n.*(?:NASCIMENTO|DATA)/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = filteredText.match(pattern);
      if (match && match[1]) {
        const name = CNHCommon.cleanName(match[1]);
        if (CNHCommon.isValidName(name)) {
          return name;
        }
      }
    }
    
    const mrzData = this.extractFromMRZ(text);
    return mrzData.fullName || null;
  }
  
  extractCPF(text: string): string | null {
    const filteredText = this.filterInstitutionalNoise(text);
    return CNHCommon.extractCPFFromText(filteredText);
  }
  
  extractRG(text: string): string | null {
    const filteredText = this.filterInstitutionalNoise(text);
    
    const patterns = [
      /(?:DOC\.?\s*IDENTIDADE|4[Cc]\s*DOC|RG)[:\s]*(\d[\d\.\-\/]*\d)/i,
      /(\d{1,2}[\.\s]?\d{3}[\.\s]?\d{3}[-.]?\d?)/,
    ];
    
    for (const pattern of patterns) {
      const match = filteredText.match(pattern);
      if (match && match[1]) {
        const rg = match[1].replace(/[^\d]/g, '');
        if (rg.length >= 7 && rg.length <= 10) {
          return match[1];
        }
      }
    }
    
    return null;
  }
  
  extractBirthDate(text: string): string | null {
    const filteredText = this.filterInstitutionalNoise(text);
    
    const birthPatterns = [
      /(?:DATA\s*(?:DE\s*)?NASCIMENTO|3\s*DATA)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
      /NASCIMENTO[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
    ];
    
    for (const pattern of birthPatterns) {
      const match = filteredText.match(pattern);
      if (match && match[1]) {
        return CNHCommon.formatDate(match[1]);
      }
    }
    
    const mrzData = this.extractFromMRZ(text);
    return mrzData.birthDate || null;
  }
  
  extractFiliation(text: string): { mother?: string; father?: string } | null {
    const filteredText = this.filterInstitutionalNoise(text);
    
    const filiacaoPatterns = [
      /FILIA[ÇC][ÃA]O[:\s]*\n?\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)\n\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)/i,
      /(?:M[ÃA]E|MAE)[:\s]*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)/i,
    ];
    
    for (const pattern of filiacaoPatterns) {
      const match = filteredText.match(pattern);
      if (match) {
        if (match[2]) {
          return {
            father: CNHCommon.cleanName(match[1]),
            mother: CNHCommon.cleanName(match[2]),
          };
        } else if (match[1]) {
          return {
            mother: CNHCommon.cleanName(match[1]),
          };
        }
      }
    }
    
    return null;
  }
  
  extractBirthPlace(text: string): string | null {
    const filteredText = this.filterInstitutionalNoise(text);
    
    const patterns = [
      /(?:LOCAL\s*(?:DE\s*)?NASCIMENTO|NATURALIDADE)[:\s]*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s,\-\/]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = filteredText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  private extractCategoria(text: string): string | null {
    const filteredText = this.filterInstitutionalNoise(text);
    return CNHCommon.extractCategoria(filteredText);
  }
  
  private extractValidade(text: string): string | null {
    const filteredText = this.filterInstitutionalNoise(text);
    
    const validadePatterns = [
      /VALIDADE[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
      /V[ÁA]LIDA\s*AT[ÉE][:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
    ];
    
    for (const pattern of validadePatterns) {
      const match = filteredText.match(pattern);
      if (match && match[1]) {
        return CNHCommon.formatDate(match[1]);
      }
    }
    
    return null;
  }
  
  async extract(text: string): Promise<ExtractedIdentityData> {
    console.log('📱 [CNH-Digital] Iniciando extração de CNH-e...');
    
    const result: ExtractedIdentityData = {};
    
    result.fullName = this.extractFullName(text) || undefined;
    result.cpf = this.extractCPF(text) || undefined;
    result.rg = this.extractRG(text) || undefined;
    result.birthDate = this.extractBirthDate(text) || undefined;
    result.filiation = this.extractFiliation(text) || undefined;
    result.birthPlace = this.extractBirthPlace(text) || undefined;
    result.categoria = this.extractCategoria(text) || undefined;
    result.validade = this.extractValidade(text) || undefined;
    
    console.log('📱 [CNH-Digital] Extração concluída:', {
      nome: result.fullName ? '✓' : '✗',
      cpf: result.cpf ? '✓' : '✗',
      rg: result.rg ? '✓' : '✗',
      dataNascimento: result.birthDate ? '✓' : '✗',
      categoria: result.categoria ? '✓' : '✗',
    });
    
    return result;
  }
  
  getConfidence(data: ExtractedIdentityData): number {
    let score = 0;
    const weights = {
      fullName: 25,
      cpf: 25,
      birthDate: 20,
      rg: 15,
      categoria: 10,
      validade: 5,
    };
    
    if (data.fullName && data.fullName.split(/\s+/).length >= 2) score += weights.fullName;
    if (data.cpf && data.cpf.replace(/\D/g, '').length === 11) score += weights.cpf;
    if (data.birthDate) score += weights.birthDate;
    if (data.rg) score += weights.rg;
    if (data.categoria) score += weights.categoria;
    if (data.validade) score += weights.validade;
    
    return Math.min(score, 100);
  }
}
