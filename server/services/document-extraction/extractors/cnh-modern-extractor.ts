/**
 * Extrator dedicado para CNH Moderna (novo modelo)
 * Layout: Labels numerados (2 e 1, 4a, 4b, 4c, 4d, 5, 9), bilíngue (DRIVER LICENSE)
 * Usado para CNHs emitidas a partir de ~2022
 * 
 * Campos característicos:
 * - "2 e 1 NOME E SOBRENOME"
 * - "3 DATA, LOCAL E UF DE NASCIMENTO"
 * - "4a DATA EMISSÃO", "4b VALIDADE", "4c DOC IDENTIDADE", "4d CPF"
 * - "5 Nº REGISTRO", "9 CAT HAB"
 * - "NACIONALIDADE", "FILIAÇÃO"
 * - "DRIVER LICENSE / PERMISO DE CONDUCCIÓN"
 */

import { IIdentityExtractor, ExtractedIdentityData } from './identity-extractor-interface';
import { matchLabel } from '../utils/fuzzy-label-matcher';
import { CNHSpecificData, CNHCommon } from './cnh-common';

export class CNHModernExtractor implements IIdentityExtractor {
  
  canHandle(text: string): boolean {
    const normalizedText = text.toUpperCase();
    
    const modernPatterns = [
      /DRIVER\s*LICENSE/,
      /PERMISO\s*DE\s*CONDUCCI/,
      /NOME\s*E\s*SOBRENOME/,
      /2\s*E\s*1\s*NOME/,
      /DATA,?\s*LOCAL\s*E\s*UF/,
      /4[A-D]\s*(DATA|CPF|DOC|VALIDADE)/i,
      /NACIONALIDADE/,
      /SECRETARIA\s*NACIONAL\s*DE\s*TR[ÂA]NSITO/,
      /BRASILEIRO\s*\(A\)/,
    ];
    
    const matches = modernPatterns.filter(pattern => pattern.test(normalizedText)).length;
    return matches >= 2;
  }
  
  async extract(text: string): Promise<ExtractedIdentityData> {
    console.log('🚗 [CNH-Modern] Iniciando extração...');
    
    const data: ExtractedIdentityData = {
      fullName: this.extractFullName(text) || undefined,
      rg: this.extractRG(text) || undefined,
      cpf: this.extractCPF(text) || undefined,
      birthDate: this.extractBirthDate(text) || undefined,
      birthPlace: this.extractBirthPlace(text) || undefined,
      filiation: this.extractFiliation(text) || undefined,
      issuedDate: this.extractIssuedDate(text) || undefined,
      issuedBy: 'DETRAN',
    };
    
    const cnhSpecific = this.extractCNHSpecificData(text);
    
    console.log('🚗 [CNH-Modern] Dados extraídos:', data);
    console.log('🚗 [CNH-Modern] Dados específicos CNH:', cnhSpecific);
    
    return { ...data, ...cnhSpecific };
  }
  
  /**
   * Extrai nome completo
   * Label: "2 e 1 NOME E SOBRENOME" ou "NOME E SOBRENOME"
   */
  extractFullName(text: string): string | null {
    console.log('🔍 [CNH-Modern] Extraindo nome...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineUpper = line.toUpperCase();
      
      if (lineUpper.includes('NOME E SOBRENOME') || 
          lineUpper.includes('NOME E SOBRE') ||
          /2\s*E\s*1\s*NOME/i.test(lineUpper)) {
        console.log(`🚗 [CNH-Modern] Label "Nome e Sobrenome" encontrado na linha ${i}: "${line}"`);
        
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (CNHCommon.isValidName(nextLine)) {
            console.log('✅ [CNH-Modern] Nome encontrado:', nextLine);
            return CNHCommon.cleanName(nextLine);
          }
        }
      }
    }
    
    console.log('❌ [CNH-Modern] Nome não encontrado');
    return null;
  }
  
  /**
   * Extrai CPF
   * Label: "4d CPF"
   */
  extractCPF(text: string): string | null {
    console.log('🔍 [CNH-Modern] Extraindo CPF...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineUpper = line.toUpperCase();
      
      if (lineUpper.includes('4D CPF') || 
          lineUpper.includes('4D') && lineUpper.includes('CPF') ||
          matchLabel(lineUpper, 'CPF')) {
        console.log(`🚗 [CNH-Modern] Label "4d CPF" encontrado na linha ${i}: "${line}"`);
        
        const inlineCPF = CNHCommon.extractCPFFromText(line);
        if (inlineCPF) {
          console.log('✅ [CNH-Modern] CPF encontrado inline:', inlineCPF);
          return inlineCPF;
        }
        
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          const cpf = CNHCommon.extractCPFFromText(nextLine);
          if (cpf) {
            console.log('✅ [CNH-Modern] CPF encontrado:', cpf);
            return cpf;
          }
        }
      }
    }
    
    const fallbackCPF = CNHCommon.extractCPFFromText(text);
    if (fallbackCPF) {
      console.log('✅ [CNH-Modern] CPF encontrado via fallback:', fallbackCPF);
      return fallbackCPF;
    }
    
    console.log('❌ [CNH-Modern] CPF não encontrado');
    return null;
  }
  
  /**
   * Extrai RG/Doc Identidade
   * Label: "4c DOC IDENTIDADE / ÓRG EMISSOR / UF"
   */
  extractRG(text: string): string | null {
    console.log('🔍 [CNH-Modern] Extraindo RG...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineUpper = line.toUpperCase();
      
      if (lineUpper.includes('4C DOC') || 
          lineUpper.includes('DOC IDENTIDADE') ||
          (lineUpper.includes('4C') && lineUpper.includes('IDENTIDADE'))) {
        console.log(`🚗 [CNH-Modern] Label "4c Doc Identidade" encontrado na linha ${i}: "${line}"`);
        
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          const rg = CNHCommon.extractRGFromText(nextLine);
          if (rg) {
            console.log('✅ [CNH-Modern] RG encontrado:', rg);
            return rg;
          }
        }
      }
    }
    
    console.log('❌ [CNH-Modern] RG não encontrado');
    return null;
  }
  
  /**
   * Extrai data de nascimento
   * Label: "3 DATA, LOCAL E UF DE NASCIMENTO"
   */
  extractBirthDate(text: string): string | null {
    console.log('🔍 [CNH-Modern] Extraindo data de nascimento...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineUpper = line.toUpperCase();
      
      if (lineUpper.includes('DATA, LOCAL') || 
          lineUpper.includes('DATA,LOCAL') ||
          lineUpper.includes('UF DE NASCIMENTO') ||
          (lineUpper.includes('3') && lineUpper.includes('NASCIMENTO'))) {
        console.log(`🚗 [CNH-Modern] Label "Data Nascimento" encontrado na linha ${i}: "${line}"`);
        
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          const date = CNHCommon.extractDatePattern(nextLine);
          if (date) {
            console.log('✅ [CNH-Modern] Data nascimento encontrada:', date);
            return date;
          }
        }
      }
    }
    
    console.log('❌ [CNH-Modern] Data de nascimento não encontrada');
    return null;
  }
  
  /**
   * Extrai local de nascimento
   * Label: "3 DATA, LOCAL E UF DE NASCIMENTO" (após a data)
   */
  extractBirthPlace(text: string): string | null {
    console.log('🔍 [CNH-Modern] Extraindo local de nascimento...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineUpper = line.toUpperCase();
      
      if (lineUpper.includes('DATA, LOCAL') || 
          lineUpper.includes('UF DE NASCIMENTO')) {
        
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          const placeMatch = nextLine.match(/\d{2}\/\d{2}\/\d{4},?\s*(.+)/);
          if (placeMatch && placeMatch[1]) {
            const place = placeMatch[1].trim();
            if (place.length > 2 && place.length < 50) {
              console.log('✅ [CNH-Modern] Local nascimento encontrado:', place);
              return place;
            }
          }
        }
      }
    }
    
    console.log('❌ [CNH-Modern] Local de nascimento não encontrado');
    return null;
  }
  
  /**
   * Extrai filiação (pai e mãe)
   * Label: "FILIAÇÃO"
   */
  extractFiliation(text: string): { mother?: string; father?: string } | null {
    console.log('🔍 [CNH-Modern] Extraindo filiação...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let mother: string | undefined;
    let father: string | undefined;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineUpper = line.toUpperCase();
      
      if (matchLabel(lineUpper, 'FILIAÇÃO') || matchLabel(lineUpper, 'FILIACAO')) {
        console.log(`🚗 [CNH-Modern] Label "Filiação" encontrado na linha ${i}: "${line}"`);
        
        let namesFound = 0;
        for (let j = i + 1; j < Math.min(i + 5, lines.length) && namesFound < 2; j++) {
          const nextLine = lines[j].trim();
          
          if (nextLine.toUpperCase().includes('ASSINATURA') ||
              nextLine.toUpperCase().includes('PORTADOR')) {
            break;
          }
          
          if (CNHCommon.isValidName(nextLine)) {
            if (namesFound === 0) {
              father = CNHCommon.cleanName(nextLine);
              console.log('✅ [CNH-Modern] Pai encontrado:', father);
            } else {
              mother = CNHCommon.cleanName(nextLine);
              console.log('✅ [CNH-Modern] Mãe encontrada:', mother);
            }
            namesFound++;
          }
        }
        break;
      }
    }
    
    if (mother || father) {
      return { mother, father };
    }
    
    console.log('❌ [CNH-Modern] Filiação não encontrada');
    return null;
  }
  
  /**
   * Extrai data de emissão
   * Label: "4a DATA EMISSÃO"
   */
  extractIssuedDate(text: string): string | null {
    console.log('🔍 [CNH-Modern] Extraindo data de emissão...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineUpper = line.toUpperCase();
      
      if (lineUpper.includes('4A DATA') || 
          lineUpper.includes('DATA EMISSÃO') ||
          lineUpper.includes('DATA EMISSAO')) {
        console.log(`🚗 [CNH-Modern] Label "Data Emissão" encontrado na linha ${i}: "${line}"`);
        
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          const date = CNHCommon.extractDatePattern(nextLine);
          if (date) {
            console.log('✅ [CNH-Modern] Data emissão encontrada:', date);
            return date;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extrai dados específicos da CNH (categoria, validade, registro, etc.)
   */
  extractCNHSpecificData(text: string): CNHSpecificData {
    const cnhData: CNHSpecificData = {};
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineUpper = line.toUpperCase();
      
      if ((lineUpper.includes('4B VALIDADE') || lineUpper.includes('4B') && lineUpper.includes('VALIDADE')) && !cnhData.validade) {
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const date = CNHCommon.extractDatePattern(lines[j]);
          if (date) {
            cnhData.validade = date;
            console.log('✅ [CNH-Modern] Validade encontrada:', date);
            break;
          }
        }
      }
      
      if ((lineUpper.includes('1ª HABILITAÇÃO') || lineUpper.includes('1A HABILITAÇÃO') || lineUpper.includes('HABILITACAO')) && !cnhData.primeiraHabilitacao) {
        const inlineDate = CNHCommon.extractDatePattern(line);
        if (inlineDate) {
          cnhData.primeiraHabilitacao = inlineDate;
        } else {
          for (let j = i + 1; j < Math.min(i + 2, lines.length); j++) {
            const date = CNHCommon.extractDatePattern(lines[j]);
            if (date) {
              cnhData.primeiraHabilitacao = date;
              break;
            }
          }
        }
        if (cnhData.primeiraHabilitacao) {
          console.log('✅ [CNH-Modern] 1ª Habilitação encontrada:', cnhData.primeiraHabilitacao);
        }
      }
      
      if ((lineUpper.includes('5 N') && lineUpper.includes('REGISTRO')) || lineUpper.includes('Nº REGISTRO')) {
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const match = lines[j].match(/(\d{9,11})/);
          if (match) {
            cnhData.registroCNH = match[1];
            console.log('✅ [CNH-Modern] Registro CNH encontrado:', cnhData.registroCNH);
            break;
          }
        }
      }
      
      if ((lineUpper.includes('9 CAT') || lineUpper.includes('CAT HAB') || lineUpper.includes('CATEGORIA')) && !cnhData.categoria) {
        const catMatch = line.match(/\b([A-E]{1,2})\s*$/);
        if (catMatch) {
          cnhData.categoria = catMatch[1];
        } else {
          for (let j = i + 1; j < Math.min(i + 2, lines.length); j++) {
            const match = lines[j].match(/^([A-E]{1,2})$/);
            if (match) {
              cnhData.categoria = match[1];
              break;
            }
          }
        }
        if (cnhData.categoria) {
          console.log('✅ [CNH-Modern] Categoria encontrada:', cnhData.categoria);
        }
      }
      
      if (lineUpper.includes('NACIONALIDADE') && !cnhData.nacionalidade) {
        for (let j = i + 1; j < Math.min(i + 2, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.toUpperCase().includes('BRASILEIRO') || nextLine.length > 3) {
            cnhData.nacionalidade = nextLine;
            console.log('✅ [CNH-Modern] Nacionalidade encontrada:', cnhData.nacionalidade);
            break;
          }
        }
      }
    }
    
    return cnhData;
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
