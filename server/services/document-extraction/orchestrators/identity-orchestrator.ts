/**
 * Orquestrador para extração de documentos de identidade
 * Coordena a detecção e extração de dados de RG, CNH, etc.
 */

import { DocumentTypeDetector } from '../detectors/document-type-detector';
import { RGAntigoUnificadoExtractor } from '../extractors/rg-antigo-unificado-extractor';
import { CNHOrchestrator } from './cnh-orchestrator';
import { IIdentityExtractor, ExtractedIdentityData } from '../extractors/identity-extractor-interface';
import { FlowDebugger } from '../utils/flow-debugger';
import type { UnifiedExtractionResult } from '../types/extraction-types';
import { UnifiedResultBuilder, DocumentType } from '../types/unified-result-builder';

export interface IdentityExtractionResult {
  success: boolean;
  data?: {
    documentType: string;
    subtype?: string;
    fullName?: string;
    rg?: string;
    cpf?: string;
    birthDate?: string;
    filiation?: {
      mother?: string;
      father?: string;
    };
    birthPlace?: string;
    issuedDate?: string;
    issuedBy?: string;
    documentOrigin?: string;
    categoria?: string;
    validade?: string;
    primeiraHabilitacao?: string;
  };
  confidence?: {
    overall: number;
    name: number;
    rg: number;
    cpf: number;
    birthDate: number;
  };
  method?: {
    type: string;
    details: string;
  };
  error?: string;
}

export class IdentityOrchestrator {
  private rgAntigoUnificadoExtractor: RGAntigoUnificadoExtractor;
  private cnhOrchestrator: CNHOrchestrator;

  constructor() {
    this.rgAntigoUnificadoExtractor = new RGAntigoUnificadoExtractor();
    this.cnhOrchestrator = new CNHOrchestrator();
  }

  /**
   * Detecta o subtipo específico de RG
   * Movido do document-type-detector para manter consistência com cnh-orchestrator
   */
  private detectRGSubtype(text: string): string {
    const normalizedText = text.toUpperCase();
    
    // CIN Nova (Carteira de Identidade Nacional)
    if (
      normalizedText.includes("CARTEIRA DE IDENTIDADE NACIONAL") ||
      normalizedText.includes("CIN") ||
      (normalizedText.includes("REPÚBLICA FEDERATIVA DO BRASIL") &&
        normalizedText.includes("QR")) ||
      normalizedText.includes("REGISTRO NACIONAL")
    ) {
      console.log('🆔 Subtipo detectado: CIN_NOVA');
      return "CIN_NOVA";
    }

    // RG Antigo (todos os estados brasileiros)
    if (
      normalizedText.includes("CARTEIRA DE IDENTIDADE") ||
      normalizedText.includes("REGISTRO GERAL") ||
      normalizedText.includes("SECRETARIA DA SEGURANÇA PÚBLICA") ||
      normalizedText.includes("INSTITUTO DE IDENTIFICAÇÃO") ||
      normalizedText.includes("SSP/")
    ) {
      console.log('🆔 Subtipo detectado: RG_ANTIGO');
      return "RG_ANTIGO";
    }

    // RG Genérico (fallback)
    console.log('🆔 Subtipo detectado: RG_GENERICO (fallback)');
    return "RG_GENERICO";
  }

  /**
   * Processa documento de identidade (RG ou CNH)
   */
  async processIdentityDocument(text: string): Promise<IdentityExtractionResult> {
    FlowDebugger.enter('identity-orchestrator.ts', 'processIdentityDocument', { textLength: text.length });
    
    try {
      console.log('🆔 Iniciando processamento de documento de identidade...');

      // Passo 1: Detectar tipo de documento
      const documentTypeResult = DocumentTypeDetector.detectDocumentType(text);
      FlowDebugger.data('identity-orchestrator.ts', 'processIdentityDocument', 'Tipo detectado', documentTypeResult);
      
      console.log('🆔 Tipo de documento:', documentTypeResult.type);
      console.log('🆔 Subtipo:', documentTypeResult.subtype);
      console.log('🆔 Confiança na detecção:', (documentTypeResult.confidence * 100).toFixed(1) + '%');

      // Processar conforme tipo detectado
      if (documentTypeResult.type === 'CNH_LICENSE') {
        return await this.processCNH(text, documentTypeResult);
      } else if (documentTypeResult.type === 'RG_IDENTITY') {
        return await this.processRG(text, documentTypeResult);
      } else {
        FlowDebugger.error('identity-orchestrator.ts', 'processIdentityDocument', 'Documento não reconhecido');
        return this.createErrorResult('Documento não identificado como RG ou CNH');
      }

    } catch (error) {
      FlowDebugger.error('identity-orchestrator.ts', 'processIdentityDocument', error);
      console.error('❌ Erro no processamento do documento:', error);
      return this.createErrorResult(`Erro no processamento: ${error}`);
    }
  }

  /**
   * Processa documento RG
   */
  private async processRG(text: string, documentTypeResult: any): Promise<IdentityExtractionResult> {
    console.log('🆔 Usando extração integrada RG...');
    
    // Detectar subtipo do RG (CIN_NOVA, RG_ANTIGO, RG_GENERICO)
    const rgSubtype = this.detectRGSubtype(text);
    FlowDebugger.data('identity-orchestrator.ts', 'processRG', 'Subtipo RG detectado', rgSubtype);
    
    FlowDebugger.transition('identity-orchestrator.ts', 'processRG', 'extractRGDataIntegrated', 'extract');
    const extractedData = await this.extractRGDataIntegrated(text);
    FlowDebugger.data('identity-orchestrator.ts', 'processRG', 'Dados extraídos', extractedData);

    const confidence = this.calculateConfidence(extractedData);
    FlowDebugger.data('identity-orchestrator.ts', 'processRG', 'Confiança calculada', confidence);

    const result: IdentityExtractionResult = {
      success: true,
      data: {
        documentType: 'RG',
        subtype: rgSubtype,
        fullName: extractedData.fullName,
        rg: extractedData.rg,
        cpf: extractedData.cpf,
        birthDate: extractedData.birthDate,
        filiation: extractedData.filiation,
        birthPlace: extractedData.birthPlace,
        issuedDate: extractedData.issuedDate,
        issuedBy: extractedData.issuedBy,
        documentOrigin: extractedData.documentOrigin
      },
      confidence,
      method: {
        type: 'INTEGRATED_EXTRACTION',
        details: `Processado com extração integrada RG (${rgSubtype})`
      }
    };

    console.log('✅ Extração de RG concluída com sucesso');
    console.log('📊 Dados extraídos:', result.data);
    console.log('📊 Confiança geral:', (confidence.overall * 100).toFixed(1) + '%');

    FlowDebugger.exit('identity-orchestrator.ts', 'processRG', result);
    return result;
  }

  /**
   * Processa documento CNH
   */
  private async processCNH(text: string, documentTypeResult: any): Promise<IdentityExtractionResult> {
    console.log('🚗 Usando extração dedicada CNH...');
    
    FlowDebugger.transition('identity-orchestrator.ts', 'processCNH', 'cnhOrchestrator.extract', 'extract');
    const extractedData = await this.cnhOrchestrator.extract(text);
    FlowDebugger.data('identity-orchestrator.ts', 'processCNH', 'Dados extraídos', extractedData);

    const confidence = this.calculateCNHConfidence(extractedData);
    FlowDebugger.data('identity-orchestrator.ts', 'processCNH', 'Confiança calculada', confidence);

    const result: IdentityExtractionResult = {
      success: true,
      data: {
        documentType: 'CNH',
        subtype: documentTypeResult.subtype,
        fullName: extractedData.fullName,
        rg: extractedData.rg,
        cpf: extractedData.cpf,
        birthDate: extractedData.birthDate,
        filiation: extractedData.filiation,
        birthPlace: extractedData.birthPlace,
        issuedDate: extractedData.issuedDate,
        issuedBy: extractedData.issuedBy || 'DETRAN',
        categoria: extractedData.categoria,
        validade: extractedData.validade,
        primeiraHabilitacao: extractedData.primeiraHabilitacao,
      },
      confidence,
      method: {
        type: 'CNH_EXTRACTION',
        details: 'Processado com extração dedicada CNH'
      }
    };

    console.log('✅ Extração de CNH concluída com sucesso');
    console.log('📊 Dados extraídos:', result.data);
    console.log('📊 Confiança geral:', (confidence.overall * 100).toFixed(1) + '%');

    FlowDebugger.exit('identity-orchestrator.ts', 'processCNH', result);
    return result;
  }

  /**
   * Calcula confiança para CNH
   */
  private calculateCNHConfidence(data: ExtractedIdentityData): {
    overall: number;
    name: number;
    rg: number;
    cpf: number;
    birthDate: number;
  } {
    const nameScore = data.fullName ? 1 : 0;
    const cpfScore = data.cpf ? 1 : 0;
    const rgScore = data.rg ? 1 : 0;
    const birthDateScore = data.birthDate ? 1 : 0;
    const categoriaScore = data.categoria ? 1 : 0;
    const validadeScore = data.validade ? 1 : 0;

    const weightedScore = (nameScore * 3 + cpfScore * 3 + rgScore * 2 + birthDateScore * 2 + categoriaScore * 2 + validadeScore * 1) / 13;

    return {
      overall: weightedScore,
      name: nameScore,
      rg: rgScore,
      cpf: cpfScore,
      birthDate: birthDateScore
    };
  }

  /**
   * Calcula confiança geral da extração
   */
  private calculateConfidence(data: ExtractedIdentityData): {
    overall: number;
    name: number;
    rg: number;
    cpf: number;
    birthDate: number;
  } {
    const nameScore = data.fullName ? 1 : 0;
    const rgScore = data.rg ? 1 : 0;
    const cpfScore = data.cpf ? 1 : 0;
    const birthDateScore = data.birthDate ? 1 : 0;

    // Campos principais (nome, RG, CPF) têm peso maior
    const weightedScore = (nameScore * 3 + rgScore * 3 + cpfScore * 2 + birthDateScore * 2) / 10;

    return {
      overall: weightedScore,
      name: nameScore,
      rg: rgScore,
      cpf: cpfScore,
      birthDate: birthDateScore
    };
  }

  /**
   * Extração integrada RG que combina nova arquitetura com lógica legada eficaz
   */
  private async extractRGDataIntegrated(text: string): Promise<ExtractedIdentityData> {
    console.log('🔧 Iniciando extração integrada RG...');
    console.log('📝 Texto completo para análise:', text);
    
    const data: ExtractedIdentityData = {};

    // Usar lógica eficaz do sistema legado para extração de nome
    this.extractNameFromRG(text, data);
    
    // Usar lógica eficaz do sistema legado para extração de CPF
    this.extractCPFFromRG(text, data);
    
    // Usar lógica eficaz do sistema legado para extração de RG
    this.extractRGFromRG(text, data);
    
    // Usar lógica eficaz do sistema legado para extração de data de nascimento
    this.extractBirthDateFromRG(text, data);
    
    // Extrair sexo/gênero
    this.extractGenderFromRG(text, data);
    
    // Extrações adicionais (filiação, naturalidade, etc.)
    this.extractAdditionalRGData(text, data);

    console.log('✅ Extração integrada concluída:', data);
    return data;
  }

  /**
   * Extrai nome usando padrões eficazes do sistema legado
   */
  private extractNameFromRG(text: string, data: ExtractedIdentityData): void {
    console.log('🔍 Iniciando extração de nome...');
    
    // Método 1: Buscar por sequência estrutural (funciona para vários estados)
    const structuralName = this.extractNameByStructure(text);
    if (structuralName) {
      data.fullName = structuralName;
      console.log('✅ Nome extraído via análise estrutural:', data.fullName);
      return;
    }

    // Método 2: Padrões híbridos que funcionam com texto estruturado e normalizado
    const nomePatterns = [
      // Padrão 1: Nome após "NOME" com quebra de linha (formato estruturado)
      /NOME[\s\n]*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+?)[\s\n]*(?:FILIACAO|FILIAÇÃO|DATA|NATURALIDADE|CPF)/i,
      
      // Padrão 2: Nome após RG em formato SP (linha corrida ou estruturada)
      /(?:RG|REGISTRO)[\s\d\.-]+(?:GERAL)?[\s\n]*(?:NOME)?[\s\n]*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕ]{3,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,})/i,
      
      // Padrão 3: Nome após DATA DE EXPEDIÇÃO (formato SP)
      /DATA\s+DE\s+EXPEDIÇÃO[\s\n]+\d{2}\/[A-Z]{3}\/\d{4}[\s\n]+(?:NOME[\s\n]+)?([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+)/i,
      
      // Padrão 4: Captura nomes típicos brasileiros (mínimo 3 palavras)
      /\b([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}\s+(?:[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{2,}\s+){1,3}[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,})\b/g
    ];
    
    for (let i = 0; i < nomePatterns.length; i++) {
      const pattern = nomePatterns[i];
      const match = text.match(pattern);
      console.log(`Padrão ${i+1}: ${match ? 'Match encontrado' : 'Sem match'}`);
      
      if (match && match[1]) {
        const candidateName = match[1].trim();
        console.log(`  Nome bruto: "${candidateName}"`);
        
        // Limpar nome capturado (remover quebras de linha e palavras inválidas)
        const cleanName = this.cleanExtractedName(candidateName);
        console.log(`  Nome limpo: "${cleanName}"`);
        
        if (this.isValidName(cleanName)) {
          data.fullName = cleanName;
          console.log('✅ Nome encontrado e validado:', data.fullName);
          return;
        } else {
          console.log('❌ Nome inválido após limpeza');
        }
      }
    }
    
    // Busca adicional: analisar todas as linhas do texto
    console.log('🔍 Analisando todas as linhas para busca de nome...');
    const documentLines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < documentLines.length; i++) {
      const line = documentLines[i];
      console.log(`Linha ${i}: "${line}"`);
      
      // Se a linha contém "NOME" seguido de dados, remover apenas a palavra "NOME"
      if (line.toUpperCase().startsWith('NOME ')) {
        const nameWithoutPrefix = line.substring(5).trim(); // Remove "NOME "
        console.log(`  Linha com NOME encontrada: "${line}"`);
        console.log(`  Nome sem prefixo: "${nameWithoutPrefix}"`);
        
        // Verificar se o que sobrou é um nome válido
        if (this.isValidName(nameWithoutPrefix)) {
          data.fullName = nameWithoutPrefix.toUpperCase();
          console.log('✅ Nome encontrado removendo prefixo NOME:', data.fullName);
          return;
        }
      }
      
      // Buscar linhas que possam conter nomes (3+ palavras em maiúscula)
      const words = line.split(/\s+/).filter(word => /^[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]+$/i.test(word));
      
      if (words.length >= 3) {
        const possibleName = words.join(' ');
        console.log(`  Possível nome: "${possibleName}"`);
        
        // Verificar se não é texto governamental/institucional
        if (!line.match(/REGISTRO|GERAL|INSTITUTO|GOVERNO|ESTADO|SECRETARIA|EXPEDIÇÃO|NATURALIDADE|FILIACAO|DATA|NASCIMENTO|MINISTÉRIO|REPÚBLICA/i)) {
          if (this.isValidName(possibleName)) {
            data.fullName = possibleName;
            console.log('✅ Nome encontrado via análise de linhas:', data.fullName);
            return;
          }
        }
      }
    }
    
    console.log('❌ Nenhum nome válido encontrado em nenhum método');

    // Se não encontrou, buscar por padrão de nome completo (3+ palavras com letras maiúsculas)
    if (!data.fullName) {
      const namePattern = /^([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]+\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]+\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]+.*?)$/gm;
      const textLines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      for (const line of textLines) {
        if (namePattern.test(line)) {
          // Verificar se não é texto governamental
          if (!line.match(/VÁLIDA|TERRITÓRIO|NACIONAL|REGISTRO|GERAL|REPÚBLICA|FEDERATIVA|BRASIL|GOVERNO|ESTADO|MINISTÉRIO|SECRETARIA|CARTÓRIO|EXPEDIÇÃO/i)) {
            data.fullName = line.trim();
            console.log('Nome encontrado via padrão de fallback:', data.fullName);
            break;
          }
        }
      }
    }
  }

  /**
   * Extrai CPF usando padrões eficazes do sistema legado
   */
  private extractCPFFromRG(text: string, data: ExtractedIdentityData): void {
    // Buscar CPF com formatação
    const cpfRegex = /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g;
    let match;
    
    while ((match = cpfRegex.exec(text)) !== null) {
      const cpf = match[1].replace(/[^\d]/g, '');
      if (this.isValidCPF(cpf)) {
        data.cpf = this.formatCPF(cpf);
        console.log('CPF encontrado:', data.cpf);
        break;
      }
    }
  }

  /**
   * Extrai número do RG usando padrões eficazes do sistema legado
   */
  private extractRGFromRG(text: string, data: ExtractedIdentityData): void {
    console.log('🔍 Iniciando extração de RG do texto...');
    
    // Buscar números que podem ser RG com padrões mais precisos
    const rgPatterns = [
      // Padrão 1: Número no início seguido de asterisco (comum em RG SP)
      /^(\d{2}\.\d{3}\.\d{3}-\d{2})\s*\*/m,
      // Padrão 2: REGISTRO seguido de número
      /REGISTRO\s+(\d{1,2}\.?\d{3}\.?\d{3}-?\d{1,2})/i,
      // Padrão 3: Estrutura REGISTRO GERAL
      /REGISTRO\s+(\d+\.?\d+\.?\d+-?\d+)\s+GERAL/i,
      // Padrão 4: Busca por padrão RG formatado no texto todo
      /(\d{2}\.\d{3}\.\d{3}-\d{2})/g,
      // Padrão 5: Busca por padrão RG menos formatado
      /(\d{1,2}\.\d{3}\.\d{3}-?\d{1,2})/g
    ];

    for (let i = 0; i < rgPatterns.length; i++) {
      const pattern = rgPatterns[i];
      const matches = text.match(pattern);
      console.log(`Padrão ${i+1}: ${pattern} → ${matches ? 'Match: ' + matches[1] : 'Sem match'}`);
      
      if (matches && matches[1]) {
        const rgNumber = matches[1];
        const digits = rgNumber.replace(/[^\d]/g, '');
        
        console.log(`RG candidato: "${rgNumber}" (${digits.length} dígitos)`);
        
        // Verificar se é um RG válido (7-10 dígitos, não é CPF de 11 dígitos)
        if (digits.length >= 7 && digits.length <= 10 && digits.length !== 11) {
          // Verificar se não é um CPF (evitar confusão)
          if (!this.isValidCPF(digits)) {
            data.rg = rgNumber;
            console.log('✅ RG encontrado e validado:', data.rg);
            return;
          } else {
            console.log('❌ Rejeitado: é um CPF válido, não RG');
          }
        } else {
          console.log(`❌ Rejeitado: ${digits.length} dígitos fora do range válido (7-10)`);
        }
      }
    }
    
    console.log('❌ Nenhum RG válido encontrado');
  }

  /**
   * Extrai data de nascimento usando padrões eficazes do sistema legado
   */
  private extractBirthDateFromRG(text: string, data: ExtractedIdentityData): void {
    console.log('🔍 Iniciando extração de data de nascimento...');
    
    // PRIORIDADE 1: Buscar data na linha seguinte a "DATA DE NASCIMENTO" (análise estrutural)
    const lines = text.split('\n').map(l => l.trim());
    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i].toUpperCase();
      if (currentLine.includes('DATA DE NASCIMENTO') || currentLine.includes('DATE OF BIRTH')) {
        // Verificar próxima linha para encontrar a data
        const nextLine = lines[i + 1];
        const dateMatch = nextLine.match(/^(\d{1,2}\/\d{1,2}\/\d{4})$/);
        if (dateMatch) {
          const formattedDate = this.formatBirthDate(dateMatch[1]);
          if (formattedDate && this.isValidBirthDate(formattedDate)) {
            data.birthDate = formattedDate;
            console.log('✅ Data de nascimento extraída via análise estrutural:', data.birthDate);
            return;
          } else {
            console.log(`❌ Data estrutural "${dateMatch[1]}" inválida (futuro ou formato incorreto)`);
          }
        }
      }
    }
    
    // Padrões mais precisos para data de nascimento
    const datePatterns = [
      // Padrão específico: DATA DE NASCIMENTO seguido da data na mesma linha
      /DATA\s+DE\s+NASCIMENTO\s+(\d{1,2}\/[A-Z]{3}\/\d{4})/i,
      // Padrão: NASCIMENTO seguido da data com mês abreviado
      /NASCIMENTO\s+(\d{1,2}\/[A-Z]{3}\/\d{4})/i,
      // Padrão numérico tradicional na mesma linha
      /DATA\s+DE\s+NASCIMENTO\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /NASCIMENTO\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // Padrão específico para RG RS: data após NATURALIDADE ou DOC. ORIGEM
      /(?:NATURALIDADE|DOC\.\s*ORIGEM)[\s\S]*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // Padrão: data numérica isolada no final do documento (comum no RG RS)
      /(\d{1,2}\/\d{1,2}\/\d{4})(?!.*\d{2}\/\d{2}\/\d{4})/,
      // Padrão com mês abreviado brasileiro (último para não conflitar)
      /(\d{1,2}\/(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\/\d{4})/i
    ];

    for (let i = 0; i < datePatterns.length; i++) {
      const pattern = datePatterns[i];
      const match = text.match(pattern);
      console.log(`Padrão ${i+1}: ${pattern} → ${match ? 'Match: ' + match[1] : 'Sem match'}`);
      
      if (match && match[1]) {
        const dateStr = match[1];
        const formattedDate = this.formatBirthDate(dateStr);
        console.log(`Data candidata: "${dateStr}" → Formatada: "${formattedDate}"`);
        
        if (formattedDate && this.isValidBirthDate(formattedDate)) {
          data.birthDate = formattedDate;
          console.log('✅ Data de nascimento encontrada e validada:', data.birthDate);
          return;
        } else if (formattedDate) {
          console.log(`❌ Data "${formattedDate}" rejeitada: está no futuro`);
        }
      }
    }
    
    console.log('❌ Nenhuma data de nascimento válida encontrada');
  }

  /**
   * Valida se a data de nascimento é válida (não pode ser no futuro)
   */
  private isValidBirthDate(dateStr: string): boolean {
    try {
      const birthDate = new Date(dateStr);
      const today = new Date();
      
      // Data de nascimento não pode ser no futuro
      if (birthDate > today) {
        console.log(`❌ Data ${dateStr} é no futuro (hoje: ${today.toISOString().split('T')[0]})`);
        return false;
      }
      
      // Data de nascimento não pode ser antes de 1900 (pessoa teria mais de 120 anos)
      const minDate = new Date('1900-01-01');
      if (birthDate < minDate) {
        console.log(`❌ Data ${dateStr} é muito antiga (antes de 1900)`);
        return false;
      }
      
      console.log(`✅ Data ${dateStr} é válida (não está no futuro)`);
      return true;
    } catch {
      console.log(`❌ Erro ao validar data ${dateStr}`);
      return false;
    }
  }

  /**
   * Extrai sexo/gênero do RG
   */
  private extractGenderFromRG(text: string, data: ExtractedIdentityData): void {
    console.log('🔍 Iniciando extração de sexo...');
    
    // Análise estrutural: buscar linha após "SEXO"
    const lines = text.split('\n').map(l => l.trim());
    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i].toUpperCase();
      if (currentLine.includes('SEXO') || currentLine === 'SEX') {
        // Verificar próxima linha para encontrar M ou F
        const nextLine = lines[i + 1].toUpperCase().trim();
        if (nextLine === 'M' || nextLine === 'MASCULINO' || nextLine === 'MASC') {
          data.gender = 'M';
          console.log('✅ Sexo extraído via análise estrutural: M (Masculino)');
          return;
        } else if (nextLine === 'F' || nextLine === 'FEMININO' || nextLine === 'FEM') {
          data.gender = 'F';
          console.log('✅ Sexo extraído via análise estrutural: F (Feminino)');
          return;
        }
      }
    }
    
    // Padrões regex para sexo na mesma linha
    const genderPatterns = [
      // Padrão: SEXO seguido de M/F na mesma linha
      /SEXO[\s:]+([MF])\b/i,
      // Padrão: SEXO/SEX seguido de MASCULINO/FEMININO
      /SEXO[\s:]+(?:MASCULINO|MASC)/i,
      /SEXO[\s:]+(?:FEMININO|FEM)/i,
      // Padrão inglês
      /SEX[\s:]+([MF])\b/i,
    ];
    
    for (const pattern of genderPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[1]) {
          data.gender = match[1].toUpperCase() as 'M' | 'F';
          console.log(`✅ Sexo extraído via regex: ${data.gender}`);
          return;
        } else if (pattern.source.includes('MASCULINO') || pattern.source.includes('MASC')) {
          data.gender = 'M';
          console.log('✅ Sexo extraído via regex: M (Masculino)');
          return;
        } else if (pattern.source.includes('FEMININO') || pattern.source.includes('FEM')) {
          data.gender = 'F';
          console.log('✅ Sexo extraído via regex: F (Feminino)');
          return;
        }
      }
    }
    
    console.log('❌ Sexo não encontrado');
  }

  /**
   * Extrai dados adicionais do RG
   */
  private extractAdditionalRGData(text: string, data: ExtractedIdentityData): void {
    // Extrair filiação
    const filiationRegex = /FILIAÇÃO[\s\n]+(.*?)(?=NATURALIDADE|DATA|DOC|CPF|$)/i;
    const filiationMatch = text.match(filiationRegex);
    if (filiationMatch && filiationMatch[1]) {
      const filiationText = filiationMatch[1].trim();
      const names = filiationText.split('\n').map(n => n.trim()).filter(n => n.length > 0);
      
      if (names.length >= 1) {
        data.filiation = {
          mother: names[0],
          father: names[1] || undefined
        };
      }
    }

    // Extrair naturalidade
    const naturalidadeRegex = /NATURALIDADE[\s\n]+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s-]+?)(?=DATA|DOC|CPF|$)/i;
    const naturalidadeMatch = text.match(naturalidadeRegex);
    if (naturalidadeMatch && naturalidadeMatch[1]) {
      data.birthPlace = naturalidadeMatch[1].trim();
    }
  }

  /**
   * Validação básica de CPF
   */
  private isValidCPF(cpf: string): boolean {
    return cpf.length === 11 && /^\d{11}$/.test(cpf) && !cpf.match(/^(\d)\1+$/);
  }

  /**
   * Formata CPF com pontos e hífen
   */
  private formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Formata data de nascimento para formato ISO
   */
  private formatBirthDate(dateStr: string): string | null {
    console.log(`🔍 Formatando data: "${dateStr}"`);
    
    // Mapeamento de meses abreviados para números
    const monthMap: Record<string, string> = {
      'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
      'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
      'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
    };
    
    // Tentar formato com mês abreviado: DD/MMM/YYYY
    const monthAbbrMatch = dateStr.match(/(\d{1,2})\/([A-Z]{3})\/(\d{4})/i);
    if (monthAbbrMatch) {
      const day = monthAbbrMatch[1].padStart(2, '0');
      const monthAbbr = monthAbbrMatch[2].toUpperCase();
      const year = monthAbbrMatch[3];
      
      if (monthMap[monthAbbr]) {
        const result = `${year}-${monthMap[monthAbbr]}-${day}`;
        console.log(`✅ Data formatada (mês abreviado): "${dateStr}" → "${result}"`);
        return result;
      }
    }
    
    // Tentar formato numérico: DD/MM/YYYY
    const numericMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (numericMatch) {
      const day = numericMatch[1].padStart(2, '0');
      const month = numericMatch[2].padStart(2, '0');
      const year = numericMatch[3];
      const result = `${year}-${month}-${day}`;
      console.log(`✅ Data formatada (numérico): "${dateStr}" → "${result}"`);
      return result;
    }
    
    console.log(`❌ Não foi possível formatar a data: "${dateStr}"`);
    return null;
  }

  /**
   * Valida se o ano de nascimento é razoável
   */
  private isValidBirthYear(dateStr: string): boolean {
    try {
      const year = parseInt(dateStr.split('/')[2]);
      const currentYear = new Date().getFullYear();
      
      // Aceitar idades entre 0 e 120 anos
      return year >= (currentYear - 120) && year <= currentYear;
    } catch (error) {
      return false;
    }
  }

  /**
   * Limpa nome extraído removendo quebras de linha e palavras inválidas
   */
  private cleanExtractedName(candidateName: string): string {
    // Remover quebras de linha e espaços extras
    let cleaned = candidateName.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Separar em palavras e filtrar palavras inválidas
    const words = cleaned.split(' ');
    const validWords = words.filter(word => {
      // Remover palavras de campos do documento e a palavra "NOME"
      if (/NOME|FILIACAO|NATURALIDADE|DATA|REGISTRO|GERAL|CPF|EXPEDIÇÃO|SECRETARIA|INSTITUTO|SSP|DETRAN|IGP|NASCIMENTO|ESTADO|PÚBLICO/i.test(word)) {
        return false;
      }
      // Manter apenas palavras com pelo menos 2 caracteres alfabéticos
      return word.length >= 2 && /^[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]+$/i.test(word);
    });
    
    return validWords.join(' ');
  }

  /**
   * Valida se um texto é um nome válido
   */
  private isValidName(text: string): boolean {
    if (!text || text.length < 5 || text.length > 60) return false;
    
    // Verificar se não contém palavras de campos do documento
    const invalidWords = /NOME|FILIACAO|NATURALIDADE|DATA|REGISTRO|GERAL|CPF|EXPEDIÇÃO|SECRETARIA|INSTITUTO|SSP|DETRAN|IGP/i;
    if (invalidWords.test(text)) return false;
    
    // Verificar se tem pelo menos 2 palavras
    const words = text.trim().split(/\s+/);
    if (words.length < 2) return false;
    
    // Verificar se todas as palavras são válidas (apenas letras)
    const namePattern = /^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]+$/i;
    return namePattern.test(text);
  }

  /**
   * Análise estrutural para extração de nomes em qualquer formato de RG brasileiro
   * Identifica padrões estruturais comuns e extrai nomes de forma inteligente
   */
  private extractNameByStructure(text: string): string | null {
    console.log('🔍 Iniciando análise estrutural para extração de nome...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('📋 Total de linhas no documento:', lines.length);
    
    // Imprimir linhas para análise
    lines.forEach((line, index) => {
      console.log(`  Linha ${index}: "${line}"`);
    });
    
    // Estratégia 1: Buscar após EXPEDIÇÃO até próximo marcador
    const afterExpedicaoName = this.findNameAfterExpedicao(lines);
    if (afterExpedicaoName) {
      console.log('✅ Nome encontrado após EXPEDIÇÃO:', afterExpedicaoName);
      return afterExpedicaoName;
    }
    
    // Estratégia 2: Buscar linhas que são claramente nomes (3+ palavras em maiúscula)
    const isolatedName = this.findIsolatedName(lines);
    if (isolatedName) {
      console.log('✅ Nome encontrado como linha isolada:', isolatedName);
      return isolatedName;
    }
    
    // Estratégia 3: Buscar nome em contexto específico
    const contextualName = this.findContextualName(text);
    if (contextualName) {
      console.log('✅ Nome encontrado por contexto:', contextualName);
      return contextualName;
    }
    
    console.log('❌ Nenhum nome encontrado via análise estrutural');
    return null;
  }
  
  /**
   * Busca nome após palavra EXPEDIÇÃO
   */
  private findNameAfterExpedicao(lines: string[]): string | null {
    let expedicaoIndex = -1;
    
    // Encontrar EXPEDIÇÃO
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === 'EXPEDIÇÃO' || lines[i].includes('EXPEDIÇÃO')) {
        expedicaoIndex = i;
        break;
      }
    }
    
    if (expedicaoIndex === -1) return null;
    
    // Buscar próximo marcador após EXPEDIÇÃO (NATURALIDADE, FILIAÇÃO, etc.)
    const stopWords = ['NATURALIDADE', 'FILIAÇÃO', 'DATA DE NASCIMENTO', 'TERRITORIO', 'REPUBLICA', 'VÁLIDA'];
    let stopIndex = lines.length;
    
    for (let i = expedicaoIndex + 1; i < lines.length; i++) {
      if (stopWords.some(word => lines[i].includes(word))) {
        stopIndex = i;
        break;
      }
    }
    
    // Examinar linhas entre EXPEDIÇÃO e próximo marcador
    const candidateLines = lines.slice(expedicaoIndex + 1, stopIndex);
    
    for (const line of candidateLines) {
      if (this.isValidNameLine(line)) {
        return line.trim().toUpperCase();
      }
    }
    
    return null;
  }
  
  /**
   * Busca nomes em linhas isoladas
   */
  private findIsolatedName(lines: string[]): string | null {
    const governmentWords = ['TERRITORIO', 'NACIONAL', 'REPUBLICA', 'FEDERATIVA', 'GOVERNO', 'ESTADO', 'SECRETARIA', 'MINISTERIO', 'CARTORIO', 'REGISTRO', 'GERAL', 'VALIDA'];
    
    for (const line of lines) {
      // Linha deve ter 3+ palavras todas em maiúscula
      const words = line.split(/\s+/);
      if (words.length >= 3 && words.length <= 6) {
        // Verificar se todas são palavras válidas de nome
        const allValidWords = words.every(word => /^[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]+$/i.test(word));
        
        if (allValidWords) {
          // Não deve conter palavras governamentais
          const hasGovernmentWords = governmentWords.some(govWord => 
            line.toUpperCase().includes(govWord)
          );
          
          if (!hasGovernmentWords && this.isValidNameLine(line)) {
            let cleanedLine = line.trim().toUpperCase();
            // Se a linha começa com "NOME ", remover apenas essa palavra
            if (cleanedLine.startsWith('NOME ')) {
              cleanedLine = cleanedLine.substring(5).trim();
            }
            return cleanedLine;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Busca nome por contexto usando padrões
   */
  private findContextualName(text: string): string | null {
    // Padrão: Nome seguido de nome de pais
    const familyPattern = /([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{4,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{4,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{2,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{4,})[\s\n]+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{4,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{4,}/i;
    
    const match = text.match(familyPattern);
    if (match && match[1]) {
      const candidateName = match[1].trim();
      if (this.isValidNameLine(candidateName)) {
        return candidateName.toUpperCase();
      }
    }
    
    return null;
  }
  
  /**
   * Valida se uma linha contém um nome válido
   */
  private isValidNameLine(line: string): boolean {
    if (!line || line.length < 6) return false;
    
    const words = line.trim().split(/\s+/);
    if (words.length < 2) return false;
    
    // Verificar se contém apenas letras e espaços
    if (!/^[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+$/i.test(line)) return false;
    
    // Não deve ser muito longo (nomes com mais de 50 caracteres são suspeitos)
    if (line.length > 50) return false;
    
    // Não deve começar com palavras de campos do documento (exceto NOME que será limpo)
    const invalidStartWords = ['FILIACAO', 'NATURALIDADE', 'DATA', 'REGISTRO', 'GERAL', 'CPF'];
    if (invalidStartWords.some(word => line.toUpperCase().startsWith(word))) return false;
    
    // Palavras muito curtas (1-2 letras) são suspeitas, exceto conectores comuns
    const validConnectors = ['DA', 'DE', 'DO', 'E'];
    const hasInvalidShortWords = words.some(word => 
      word.length <= 2 && !validConnectors.includes(word.toUpperCase())
    );
    
    if (hasInvalidShortWords) return false;
    
    return true;
  }

  /**
   * Cria resultado de erro
   */
  private createErrorResult(message: string): IdentityExtractionResult {
    return {
      success: false,
      error: message,
      confidence: {
        overall: 0,
        name: 0,
        rg: 0,
        cpf: 0,
        birthDate: 0
      }
    };
  }

  /**
   * Extrai dados e retorna no formato unificado
   * Este é o método principal que deve ser usado pelo frontend
   */
  async extractUnified(text: string): Promise<UnifiedExtractionResult> {
    const result = await this.processIdentityDocument(text);
    
    if (!result.success || !result.data) {
      return UnifiedResultBuilder.error(
        DocumentType.UNKNOWN,
        result.error || 'Falha na extração do documento de identidade',
        { method: result.method?.details }
      );
    }

    const docType = result.data.documentType === 'CNH' ? DocumentType.CNH : DocumentType.RG;
    const subtype = result.data.subtype;

    return UnifiedResultBuilder.success(
      docType,
      {
        fullName: result.data.fullName,
        cpf: result.data.cpf,
        rg: result.data.rg,
        birthDate: result.data.birthDate,
        mothersName: result.data.filiation?.mother,
        fathersName: result.data.filiation?.father,
        birthPlace: result.data.birthPlace
      },
      undefined,
      {
        subtype,
        confidence: result.confidence?.overall || 0,
        method: result.method?.details
      }
    );
  }
}