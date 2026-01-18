import { GoogleVisionOCREngine } from '../core/ocr-engine';
import { TextPreprocessor } from '../core/text-preprocessor';
import { OperatorDetector } from '../detectors/insurance-detector';
import { ANSDetector } from '../detectors/ans-detector';
import type { UnifiedExtractionResult } from '../types/extraction-types';
import { UnifiedResultBuilder } from '../types/unified-result-builder';
import { DocumentType } from '../types/document-constants';
import { FlowDebugger } from '../utils/flow-debugger';
import { SulAmericaExtractor } from '../extractors/sulamerica-extractor';
import { BradescoExtractor } from '../extractors/bradesco-extractor';
import { UnimedExtractor } from '../extractors/unimed-extractor';
import { PortoSeguroExtractor } from '../extractors/portoseguro-extractor';
import { AmilExtractor } from '../extractors/amil-extractor';
import { findOperadoraByAns } from '../../data-normalizer';
import { DocumentTypeDetector } from '../detectors/document-type-detector';
import { IdentityOrchestrator, IdentityExtractionResult } from './identity-orchestrator';

interface ExtractedData {
  plano?: string;
  numeroCarteirinha?: string;
  cns?: string;
  nomeTitular?: string;
  dataNascimento?: string;
  operadora?: string;
  normalizedOperadora?: string;
  ansCode?: string;
  operadoraId?: number;
  registroAns?: string;
  nomeCompleto?: string;
  rg?: string;
  cpf?: string;
  nomeMae?: string;
  nomePai?: string;
  naturalidade?: string;
  tipoDocumento?: string;
  subtipoDocumento?: string;
  dataExpedicao?: string;
  orgaoExpedidor?: string;
  documentoOrigem?: string;
}

interface ConfidenceScore {
  overall: number;
  operadora: number;
  plano: number;
  numeroCarteirinha: number;
  nome?: number;
  rg?: number;
  cpf?: number;
  dataNascimento?: number;
}

interface DetectionMethod {
  type: 'ANS_CODE' | 'TEXT_PATTERN' | 'FUZZY_MATCH' | 'FALLBACK' | 'IDENTITY_EXTRACTOR';
  details: string;
}

export interface ExtractionResult {
  success: boolean;
  data: ExtractedData;
  confidence: ConfidenceScore;
  method: DetectionMethod;
  errors?: string[];
}

/**
 * Orquestrador para extração de carteirinhas de plano de saúde
 * Implementa o fluxo completo: OCR → Limpeza → Detecção de Operadora → Extração
 */
export class InsuranceOrchestrator {
  private ocrEngine: GoogleVisionOCREngine;
  private sulAmericaExtractor: SulAmericaExtractor;
  private bradescoExtractor: BradescoExtractor;
  private unimedExtractor: UnimedExtractor;
  private portoSeguroExtractor: PortoSeguroExtractor;
  private amilExtractor: AmilExtractor;
  private identityOrchestrator: IdentityOrchestrator;

  constructor() {
    this.ocrEngine = new GoogleVisionOCREngine();
    this.sulAmericaExtractor = new SulAmericaExtractor();
    this.bradescoExtractor = new BradescoExtractor();
    this.unimedExtractor = new UnimedExtractor();
    this.portoSeguroExtractor = new PortoSeguroExtractor();
    this.amilExtractor = new AmilExtractor();
    this.identityOrchestrator = new IdentityOrchestrator();
  }

  /**
   * Executa o fluxo completo de extração de documento
   * @param imageBuffer Buffer da imagem do documento
   * @returns Promise<ExtractionResult> Resultado completo da extração
   */
  async processDocument(imageBuffer: Buffer): Promise<ExtractionResult> {
    FlowDebugger.clear();
    FlowDebugger.enter('extraction-orchestrator.ts', 'processDocument', { bufferSize: imageBuffer.length });
    
    try {
      console.log('🚀 Iniciando processamento completo do documento...');

      // Passo 1: Extração de texto via Google Vision API
      FlowDebugger.transition('extraction-orchestrator.ts', 'processDocument', 'ocr-engine.ts', 'extractText');
      const rawText = await this.ocrEngine.extractText(imageBuffer);
      FlowDebugger.data('extraction-orchestrator.ts', 'processDocument', 'Texto OCR extraído', { textLength: rawText?.length || 0 });
      
      if (!rawText) {
        FlowDebugger.error('extraction-orchestrator.ts', 'processDocument', 'Nenhum texto detectado na imagem');
        return this.createErrorResult('Nenhum texto detectado na imagem');
      }

      // Passo 2: Pré-processamento e limpeza do texto
      FlowDebugger.transition('extraction-orchestrator.ts', 'processDocument', 'text-preprocessor.ts', 'cleanText');
      const cleanText = TextPreprocessor.cleanText(rawText);
      FlowDebugger.data('extraction-orchestrator.ts', 'processDocument', 'Texto limpo', { originalLength: rawText.length, cleanLength: cleanText.length });

      // Passo 2.5: Detectar tipo de documento antes da detecção de operadora
      FlowDebugger.transition('extraction-orchestrator.ts', 'processDocument', 'document-type-detector.ts', 'detectDocumentType');
      const documentTypeResult = DocumentTypeDetector.detectDocumentType(cleanText);
      FlowDebugger.data('extraction-orchestrator.ts', 'processDocument', 'Tipo de documento', documentTypeResult);
      
      console.log('📋 Tipo de documento detectado:', documentTypeResult.type);
      console.log('📊 Confiança na detecção:', (documentTypeResult.confidence * 100).toFixed(1) + '%');

      // Se for documento de identidade (RG), processar com sistema especializado
      if (documentTypeResult.type === 'RG_IDENTITY') {
        return await this.processIdentityDocument(cleanText, documentTypeResult);
      }

      // Passo 3: Extração do número ANS (identificador único da operadora)
      FlowDebugger.transition('extraction-orchestrator.ts', 'processDocument', 'ans-detector.ts', 'extractANSCode');
      const ansCode = ANSDetector.extractANSCode(cleanText);
      FlowDebugger.data('extraction-orchestrator.ts', 'processDocument', 'Código ANS extraído', ansCode || 'Não encontrado');
      console.log('📋 Código ANS extraído:', ansCode || 'Não encontrado');

      // Passo 4: Identificação da operadora (ANS tem prioridade)
      let detectedOperator: string | null = null;
      
      if (ansCode) {
        // Estratégia 1: Identificar por código ANS (mais confiável)
        detectedOperator = this.findOperatorByANS(ansCode);
        if (detectedOperator) {
          console.log('✅ Operadora identificada por código ANS:', detectedOperator);
        }
      }
      
      if (!detectedOperator) {
        // Estratégia 2: Identificar por padrões de texto
        FlowDebugger.transition('extraction-orchestrator.ts', 'processDocument', 'operator-detector.ts', 'detectOperator');
        detectedOperator = OperatorDetector.detectOperator(cleanText);
      }
      
      FlowDebugger.data('extraction-orchestrator.ts', 'processDocument', 'Operadora detectada', detectedOperator || 'Não identificada');
      
      if (!detectedOperator) {
        FlowDebugger.error('extraction-orchestrator.ts', 'processDocument', 'Operadora não identificada');
        return this.createErrorResult('Operadora não identificada');
      }

      console.log('🏥 Operadora detectada:', detectedOperator);

      // Passo 5: Delegação para extrator específico da operadora
      FlowDebugger.transition('extraction-orchestrator.ts', 'processDocument', 'extraction-orchestrator.ts', 'delegateToOperatorExtractor');
      const extractedData = await this.delegateToOperatorExtractor(
        detectedOperator, 
        cleanText, 
        ansCode
      );

      FlowDebugger.data('extraction-orchestrator.ts', 'processDocument', 'Dados extraídos pela operadora', extractedData);

      // Passo 6: Dados esperados retornados pela extração específica
      if (!extractedData.numeroCarteirinha) {
        FlowDebugger.data('extraction-orchestrator.ts', 'processDocument', 'Fallback para extração genérica', 'Número da carteirinha não encontrado');
        console.log('⚠️ Número da carteirinha não extraído, tentando extração genérica...');
        // Fallback para extração genérica se não encontrou carteirinha
        FlowDebugger.transition('extraction-orchestrator.ts', 'processDocument', 'extraction-orchestrator.ts', 'extractGenericData');
        const genericData = this.extractGenericData(cleanText);
        extractedData.numeroCarteirinha = genericData.numeroCarteirinha;
        FlowDebugger.data('extraction-orchestrator.ts', 'processDocument', 'Resultado da extração genérica', genericData);
      }

      // Passo 7: Mapeamento do plano para o nome padronizado
      if (extractedData.plano) {
        FlowDebugger.transition('extraction-orchestrator.ts', 'processDocument', 'extraction-orchestrator.ts', 'mapPlanName');
        const originalPlano = extractedData.plano;
        console.log('🔄 ANTES do mapeamento - Plano:', originalPlano, 'Operadora:', detectedOperator);
        extractedData.plano = this.mapPlanName(extractedData.plano, detectedOperator);
        console.log('🔄 APÓS o mapeamento - Plano:', extractedData.plano);
        FlowDebugger.data('extraction-orchestrator.ts', 'processDocument', 'Mapeamento de plano', { original: originalPlano, mapped: extractedData.plano });
      }

      // Passo 8: Buscar operadora específica no banco de dados usando código ANS
      let operadoraId: number | undefined;
      let registroAns: string | undefined;
      let normalizedOperadora: string;

      if (ansCode) {
        console.log('🔍 Buscando operadora no banco usando código ANS:', ansCode);
        const operadoraData = await findOperadoraByAns(ansCode);
        
        if (operadoraData) {
          normalizedOperadora = operadoraData.name;
          registroAns = operadoraData.foundCode;
          operadoraId = operadoraData.id;
          console.log('✅ Operadora encontrada no banco:', operadoraData.name, 'ID:', operadoraData.id, 'ANS:', operadoraData.foundCode);
        } else {
          console.log('⚠️ Operadora não encontrada no banco para código ANS:', ansCode);
          normalizedOperadora = this.getNormalizedOperatorName(detectedOperator);
        }
      } else {
        normalizedOperadora = this.getNormalizedOperatorName(detectedOperator);
      }

      // Passo 9: Calcular confiança e método de detecção
      FlowDebugger.transition('extraction-orchestrator.ts', 'processDocument', 'extraction-orchestrator.ts', 'calculateConfidence');
      const confidence = this.calculateConfidence(extractedData);
      FlowDebugger.transition('extraction-orchestrator.ts', 'processDocument', 'extraction-orchestrator.ts', 'getDetectionMethod');
      const method = this.getDetectionMethod(ansCode, detectedOperator);

      const result: ExtractionResult = {
        success: true,
        data: {
          operadora: detectedOperator,
          normalizedOperadora: normalizedOperadora,
          plano: extractedData.plano,
          numeroCarteirinha: extractedData.numeroCarteirinha,
          nomeTitular: extractedData.nomeTitular,
          dataNascimento: extractedData.dataNascimento,
          cns: extractedData.cns,
          ansCode: ansCode || undefined,
          operadoraId: operadoraId,
          registroAns: registroAns
        },
        confidence,
        method
      };

      FlowDebugger.data('extraction-orchestrator.ts', 'processDocument', 'Resultado final completo', result);
      console.log('✅ Processamento concluído com sucesso');
      console.log('📊 Resultado final:', result);

      FlowDebugger.exit('extraction-orchestrator.ts', 'processDocument', result);
      FlowDebugger.getSummary();
      return result;

    } catch (error) {
      FlowDebugger.error('extraction-orchestrator.ts', 'processDocument', error);
      console.error('❌ Erro no processamento do documento:', error);
      const errorResult = this.createErrorResult(`Erro no processamento: ${error}`);
      FlowDebugger.exit('extraction-orchestrator.ts', 'processDocument', errorResult);
      return errorResult;
    }
  }

  /**
   * Delega extração para o extrator específico da operadora
   */
  private async delegateToOperatorExtractor(
    operatorName: string, 
    cleanText: string, 
    ansCode: string | null
  ): Promise<ExtractedData> {
    FlowDebugger.enter('extraction-orchestrator.ts', 'delegateToOperatorExtractor', { operator: operatorName, textLength: cleanText.length });
    console.log('🔄 Delegando extração para operadora:', operatorName);

    const extractedData: ExtractedData = {
      operadora: operatorName
    };

    // Usar extratores modulares específicos quando disponíveis
    if (operatorName === 'SULAMERICA') {
      return this.extractWithSulAmericaExtractor(cleanText, extractedData);
    }
    
    if (operatorName === 'BRADESCO') {
      return this.extractWithBradescoExtractor(cleanText, extractedData);
    }
    
    if (operatorName === 'UNIMED') {
      return this.extractWithUnimedExtractor(cleanText, extractedData);
    }
    
    if (operatorName === 'PORTO') {
      return this.extractWithPortoSeguroExtractor(cleanText, extractedData);
    }
    
    if (operatorName === 'AMIL') {
      return this.extractWithAmilExtractor(cleanText, extractedData);
    }

    // Fallback para extração genérica para operadoras ainda não migradas
    return this.extractWithGenericMethods(cleanText, extractedData, operatorName);
  }

  /**
   * Extração completa usando extrator Sul América
   */
  private extractWithSulAmericaExtractor(cleanText: string, extractedData: ExtractedData): ExtractedData {
    extractedData.numeroCarteirinha = this.sulAmericaExtractor.extractCardNumber(cleanText) || undefined;
    extractedData.plano = this.sulAmericaExtractor.extractPlan(cleanText) || undefined;
    extractedData.nomeTitular = this.sulAmericaExtractor.extractHolderName(cleanText) || undefined;
    extractedData.cns = this.sulAmericaExtractor.extractCNS(cleanText) || undefined;
    
    // Campos comuns usando métodos genéricos
    extractedData.dataNascimento = this.extractBirthDate(cleanText) || undefined;
    
    FlowDebugger.exit('extraction-orchestrator.ts', 'delegateToOperatorExtractor', extractedData);
    return extractedData;
  }

  /**
   * Extração completa usando extrator Bradesco
   */
  private extractWithBradescoExtractor(cleanText: string, extractedData: ExtractedData): ExtractedData {
    extractedData.numeroCarteirinha = this.bradescoExtractor.extractCardNumber(cleanText) || undefined;
    extractedData.plano = this.bradescoExtractor.extractPlan(cleanText) || undefined;
    extractedData.nomeTitular = this.bradescoExtractor.extractHolderName(cleanText) || undefined;
    extractedData.cns = this.bradescoExtractor.extractCNS(cleanText) || undefined;
    
    // Campos comuns usando métodos genéricos
    extractedData.dataNascimento = this.extractBirthDate(cleanText) || undefined;
    
    FlowDebugger.exit('extraction-orchestrator.ts', 'delegateToOperatorExtractor', extractedData);
    return extractedData;
  }

  /**
   * Extração completa usando extrator Unimed
   */
  private extractWithUnimedExtractor(cleanText: string, extractedData: ExtractedData): ExtractedData {
    extractedData.numeroCarteirinha = this.unimedExtractor.extractCardNumber(cleanText) || undefined;
    extractedData.plano = this.unimedExtractor.extractPlan(cleanText) || undefined;
    extractedData.nomeTitular = this.unimedExtractor.extractHolderName(cleanText) || undefined;
    extractedData.cns = this.unimedExtractor.extractCNS(cleanText) || undefined;
    
    // Campos comuns usando métodos genéricos
    extractedData.dataNascimento = this.extractBirthDate(cleanText) || undefined;
    
    FlowDebugger.exit('extraction-orchestrator.ts', 'delegateToOperatorExtractor', extractedData);
    return extractedData;
  }

  /**
   * Extração completa usando extrator Porto Seguro
   */
  private extractWithPortoSeguroExtractor(cleanText: string, extractedData: ExtractedData): ExtractedData {
    extractedData.numeroCarteirinha = this.portoSeguroExtractor.extractCardNumber(cleanText) || undefined;
    extractedData.plano = this.portoSeguroExtractor.extractPlan(cleanText) || undefined;
    extractedData.nomeTitular = this.portoSeguroExtractor.extractHolderName(cleanText) || undefined;
    extractedData.cns = this.portoSeguroExtractor.extractCNS(cleanText) || undefined;
    extractedData.dataNascimento = this.portoSeguroExtractor.extractBirthDate(cleanText) || undefined;
    
    FlowDebugger.exit('extraction-orchestrator.ts', 'delegateToOperatorExtractor', extractedData);
    return extractedData;
  }

  /**
   * Extração completa usando extrator Amil
   */
  private extractWithAmilExtractor(cleanText: string, extractedData: ExtractedData): ExtractedData {
    extractedData.numeroCarteirinha = this.amilExtractor.extractCardNumber(cleanText) || undefined;
    extractedData.plano = this.amilExtractor.extractPlan(cleanText) || undefined;
    extractedData.nomeTitular = this.amilExtractor.extractHolderName(cleanText) || undefined;
    extractedData.cns = this.amilExtractor.extractCNS(cleanText) || undefined;
    extractedData.dataNascimento = this.amilExtractor.extractBirthDate(cleanText) || undefined;
    
    FlowDebugger.exit('extraction-orchestrator.ts', 'delegateToOperatorExtractor', extractedData);
    return extractedData;
  }

  /**
   * Extração usando métodos genéricos para operadoras não migradas
   */
  private extractWithGenericMethods(cleanText: string, extractedData: ExtractedData, operatorName: string): ExtractedData {
    // Extração básica de campos comuns
    FlowDebugger.transition('extraction-orchestrator.ts', 'delegateToOperatorExtractor', 'extraction-orchestrator.ts', 'extractHolderName');
    extractedData.nomeTitular = this.extractHolderName(cleanText) || undefined;
    FlowDebugger.data('extraction-orchestrator.ts', 'delegateToOperatorExtractor', 'Nome titular extraído', extractedData.nomeTitular);

    FlowDebugger.transition('extraction-orchestrator.ts', 'delegateToOperatorExtractor', 'extraction-orchestrator.ts', 'extractBirthDate');
    extractedData.dataNascimento = this.extractBirthDate(cleanText) || undefined;
    FlowDebugger.data('extraction-orchestrator.ts', 'delegateToOperatorExtractor', 'Data nascimento extraída', extractedData.dataNascimento);

    FlowDebugger.transition('extraction-orchestrator.ts', 'delegateToOperatorExtractor', 'extraction-orchestrator.ts', 'extractCNS');
    extractedData.cns = this.extractCNS(cleanText) || undefined;
    FlowDebugger.data('extraction-orchestrator.ts', 'delegateToOperatorExtractor', 'CNS extraído', extractedData.cns);

    FlowDebugger.transition('extraction-orchestrator.ts', 'delegateToOperatorExtractor', 'extraction-orchestrator.ts', 'extractPlan');
    extractedData.plano = this.extractPlan(cleanText) || undefined;
    FlowDebugger.data('extraction-orchestrator.ts', 'delegateToOperatorExtractor', 'Plano extraído', extractedData.plano);

    FlowDebugger.transition('extraction-orchestrator.ts', 'delegateToOperatorExtractor', 'extraction-orchestrator.ts', 'extractCardNumberByOperator');
    extractedData.numeroCarteirinha = this.extractCardNumberByOperator(cleanText, operatorName) || undefined;
    FlowDebugger.data('extraction-orchestrator.ts', 'delegateToOperatorExtractor', 'Número carteirinha extraído', extractedData.numeroCarteirinha);

    FlowDebugger.exit('extraction-orchestrator.ts', 'delegateToOperatorExtractor', extractedData);
    return extractedData;
  }

  /**
   * Extrai número da carteirinha usando lógica específica da operadora
   */
  private extractCardNumberByOperator(text: string, operator: string): string | null {
    console.log('💳 Extraindo número da carteirinha para:', operator);
    
    // Usar extratores modulares quando disponíveis
    if (operator === 'SULAMERICA') {
      return this.sulAmericaExtractor.extractCardNumber(text);
    }
    
    if (operator === 'BRADESCO') {
      return this.bradescoExtractor.extractCardNumber(text);
    }

    // Mapeamento temporário para outras operadoras (ainda não migradas)
    const extractors = {
      'UNIMED': this.extractUnimedCard,
      'AMIL': this.extractAmilCard,
      'PORTO': this.extractPortoCard
    };

    const extractor = extractors[operator as keyof typeof extractors];
    return extractor ? extractor(text) : null;
  }

  /**
   * Extratores específicos (compatibilidade com sistema atual)
   */
  private extractBradescoCard(text: string): string | null {
    // Implementação específica Bradesco
    const pattern = /(\d{3}[\s]*\d{3}[\s]*\d{6}[\s]*\d{3})/;
    const match = text.match(pattern);
    return match ? match[1].replace(/\s/g, '') : null;
  }

  private extractUnimedCard(text: string): string | null {
    // Padrão Unimed: "0 994 910825083001 5"
    const pattern = /(\d)\s+(\d{3})\s+(\d{12})\s+(\d)/;
    const match = text.match(pattern);
    return match ? match[1] + match[2] + match[3] + match[4] : null;
  }

  private extractSulAmericaCard(text: string): string | null {
    // Padrão Sul América: "88888 4872 8768 0017" (17 dígitos com espaços, começando com 888)
    const pattern = /\b(8{4,5}[\s]*\d{4}[\s]*\d{4}[\s]*\d{4})\b/;
    const match = text.match(pattern);
    return match ? match[1].replace(/\s/g, '') : null;
  }

  private extractAmilCard(text: string): string | null {
    // Padrão Amil: "11581786 7"
    const pattern = /(\d{8})\s+(\d)/;
    const match = text.match(pattern);
    return match ? match[1] + match[2] : null;
  }

  private extractPortoCard(text: string): string | null {
    // Padrão Porto: "4869 7908 0000 0247"
    const pattern = /(\d{4})\s+(\d{4})\s+(\d{4})\s+(\d{4})/;
    const match = text.match(pattern);
    return match ? match[1] + match[2] + match[3] + match[4] : null;
  }

  /**
   * Extração de dados genéricos
   */
  private extractGenericData(text: string): ExtractedData {
    const longestNumber = this.extractLongestNumber(text);
    return {
      numeroCarteirinha: longestNumber || undefined
    };
  }

  private extractLongestNumber(text: string): string | null {
    const numbers = text.match(/\d{8,}/g) || [];
    if (numbers.length === 0) return null;
    const sorted = numbers.sort((a, b) => b.length - a.length);
    return sorted[0] || null;
  }

  private extractHolderName(text: string): string | null {
    const namePattern = /^([A-Z][A-Z\s]+)$/m;
    const match = text.match(namePattern);
    return match ? match[1].trim() : null;
  }

  private extractBirthDate(text: string): string | null {
    const datePattern = /(\d{2}\/\d{2}\/\d{4})/;
    const match = text.match(datePattern);
    return match ? match[1] : null;
  }

  private extractCNS(text: string): string | null {
    const cnsPattern = /CNS[\s:]*(\d{15})/;
    const match = text.match(cnsPattern);
    return match ? match[1] : null;
  }

  private extractPlan(text: string): string | null {
    const planPattern = /PLANO[\s:]*([A-Z][A-Z\s]+)/;
    const match = text.match(planPattern);
    return match ? match[1].trim() : null;
  }

  /**
   * Normaliza nome da operadora para busca no banco
   */
  private normalizeOperatorName(operatorCode: string): string {
    const operatorMapping = {
      'SULAMERICA': 'Sul América',
      'BRADESCO': 'Bradesco',
      'UNIMED': 'Unimed',
      'AMIL': 'Amil',
      'PORTO': 'Porto Seguro'
    };
    
    return operatorMapping[operatorCode as keyof typeof operatorMapping] || operatorCode;
  }

  /**
   * Mapeia nome do plano para versão padronizada
   */
  private mapPlanName(planName: string, operator: string): string {
    console.log('🔧 mapPlanName chamado com:', { planName, operator });
    if (!planName) return planName;
    
    const normalizedPlan = planName.toUpperCase().trim();
    console.log('🔧 Plan normalizado:', normalizedPlan);
    
    // Mapeamentos específicos por operadora
    if (operator === 'UNIMED') {
      const unimedMappings: Record<string, string> = {
        // Variações do Compacto
        'ICOMM GROUP CORPORATIVO COMPACTO ENF CP': 'Unimed Compacto',
        'COMPACTO ENF CP': 'Unimed Compacto',
        'CORPORATIVO COMPACTO': 'Unimed Compacto',
        'COMPACTO': 'Unimed Compacto',
        
        // Variações do Executivo
        'EXECUTIVO': 'Unimed Executivo',
        'EXECUTIVO ENF': 'Unimed Executivo',
        
        // Variações do Premium
        'PREMIUM': 'Unimed Premium',
        'PREMIUM ENF': 'Unimed Premium',
        
        // Variações do Master
        'MASTER': 'Unimed Master',
        'MASTER ENF': 'Unimed Master'
      };
      
      // Busca exata primeiro
      if (unimedMappings[normalizedPlan]) {
        console.log('✅ Mapeamento Unimed (exato):', planName, '→', unimedMappings[normalizedPlan]);
        return unimedMappings[normalizedPlan];
      }
      
      // Busca por palavras-chave
      if (normalizedPlan.includes('COMPACTO')) {
        console.log('✅ Mapeamento Unimed (palavra-chave):', planName, '→ Unimed Compacto');
        return 'Unimed Compacto';
      }
      if (normalizedPlan.includes('EXECUTIVO')) {
        console.log('✅ Mapeamento Unimed (palavra-chave):', planName, '→ Unimed Executivo');
        return 'Unimed Executivo';
      }
      if (normalizedPlan.includes('PREMIUM')) {
        console.log('✅ Mapeamento Unimed (palavra-chave):', planName, '→ Unimed Premium');
        return 'Unimed Premium';
      }
      if (normalizedPlan.includes('MASTER')) {
        console.log('✅ Mapeamento Unimed (palavra-chave):', planName, '→ Unimed Master');
        return 'Unimed Master';
      }
    }
    
    if (operator === 'SULAMERICA') {
      const sulAmericaMappings: Record<string, string> = {
        'EXATO': 'SulAmérica Exato',
        'CLASSICO': 'SulAmérica Clássico',
        'ESPECIAL': 'SulAmérica Especial',
        'EXECUTIVO': 'SulAmérica Executivo'
      };
      
      if (sulAmericaMappings[normalizedPlan]) {
        console.log('✅ Mapeamento SulAmérica:', planName, '→', sulAmericaMappings[normalizedPlan]);
        return sulAmericaMappings[normalizedPlan];
      }
    }
    
    if (operator === 'BRADESCO') {
      const bradescoMappings: Record<string, string> = {
        'EXECUTIVO': 'Bradesco Executivo',
        'PREMIUM': 'Bradesco Premium',
        'EMPRESARIAL': 'Bradesco Empresarial',
        'NACIONAL': 'Bradesco Nacional'
      };
      
      if (bradescoMappings[normalizedPlan]) {
        console.log('✅ Mapeamento Bradesco:', planName, '→', bradescoMappings[normalizedPlan]);
        return bradescoMappings[normalizedPlan];
      }
    }
    
    if (operator === 'PORTO') {
      const portoMappings: Record<string, string> = {
        // Mapeamentos específicos observados na carteirinha
        'BRONZE BRASIL': 'Porto Bronze Brasil',
        'PRATA BRASIL': 'Porto Prata Brasil',
        'OURO BRASIL': 'Porto Ouro Brasil',
        'DIAMANTE BRASIL': 'Porto Diamante Brasil',
        
        // Variações simplificadas
        'BRONZE': 'Porto Bronze',
        'PRATA': 'Porto Prata',
        'OURO': 'Porto Ouro',
        'DIAMANTE': 'Porto Diamante',
        'EXECUTIVO': 'Porto Executivo',
        'EMPRESARIAL': 'Porto Empresarial',
        'PREMIUM': 'Porto Premium'
      };
      
      // Busca exata primeiro
      if (portoMappings[normalizedPlan]) {
        console.log('✅ Mapeamento Porto Seguro (exato):', planName, '→', portoMappings[normalizedPlan]);
        return portoMappings[normalizedPlan];
      }
      
      // Busca por palavras-chave
      if (normalizedPlan.includes('BRONZE')) {
        console.log('✅ Mapeamento Porto Seguro (palavra-chave):', planName, '→ Porto Bronze');
        return 'Porto Bronze';
      }
      if (normalizedPlan.includes('PRATA')) {
        console.log('✅ Mapeamento Porto Seguro (palavra-chave):', planName, '→ Porto Prata');
        return 'Porto Prata';
      }
      if (normalizedPlan.includes('OURO')) {
        console.log('✅ Mapeamento Porto Seguro (palavra-chave):', planName, '→ Porto Ouro');
        return 'Porto Ouro';
      }
      if (normalizedPlan.includes('DIAMANTE')) {
        console.log('✅ Mapeamento Porto Seguro (palavra-chave):', planName, '→ Porto Diamante');
        return 'Porto Diamante';
      }
    }
    
    if (operator === 'AMIL') {
      const amilMappings: Record<string, string> = {
        // Mapeamentos específicos observados nas carteirinhas
        'AMIL S580 QP NAC R COPART PJ': 'Amil S580 Coparticipação',
        'AMIL S580 COPART': 'Amil S580 Coparticipação',
        'BLUE 300 RM RJ QP PF': 'Amil Blue 300',
        'MEDICO AMIL AMIL S': 'Amil Médico',
        'PLANO MEDICO AMIL': 'Amil Médico',
        
        // Variações dos planos Blue
        'BLUE 300': 'Amil Blue 300',
        'BLUE 400': 'Amil Blue 400',
        'BLUE 500': 'Amil Blue 500',
        
        // Variações dos planos S
        'S580': 'Amil S580',
        'S400': 'Amil S400',
        'S500': 'Amil S500',
        
        // Tipos de cobertura
        'COPART': 'Amil Coparticipação',
        'COPARTICIPACAO': 'Amil Coparticipação',
        'NACIONAL': 'Amil Nacional',
        'EXECUTIVO': 'Amil Executivo',
        'EMPRESARIAL': 'Amil Empresarial',
        'INDIVIDUAL': 'Amil Individual',
        'FAMILIAR': 'Amil Familiar',
        'STANDARD': 'Amil Standard',
        'PREMIUM': 'Amil Premium',
        
        // Linha MEDICUS - Nova linha de produtos Amil
        'MEDICUS 22': 'Amil Medicus 22',
        'MEDICUS NACIONAL': 'Amil Medicus Nacional',
        'MEDICUS EXECUTIVO': 'Amil Medicus Executivo',
        'MEDICUS 11': 'Amil Medicus 11',
        'MEDICUS 33': 'Amil Medicus 33'
      };
      
      // Busca exata primeiro
      if (amilMappings[normalizedPlan]) {
        console.log('✅ Mapeamento Amil (exato):', planName, '→', amilMappings[normalizedPlan]);
        return amilMappings[normalizedPlan];
      }
      
      // Busca por palavras-chave
      if (normalizedPlan.includes('BLUE')) {
        const blueMatch = normalizedPlan.match(/BLUE\s*(\d+)/);
        if (blueMatch) {
          const result = `Amil Blue ${blueMatch[1]}`;
          console.log('✅ Mapeamento Amil (palavra-chave):', planName, '→', result);
          return result;
        }
        console.log('✅ Mapeamento Amil (palavra-chave):', planName, '→ Amil Blue');
        return 'Amil Blue';
      }
      if (normalizedPlan.includes('S580')) {
        console.log('✅ Mapeamento Amil (palavra-chave):', planName, '→ Amil S580');
        return 'Amil S580';
      }
      if (normalizedPlan.includes('COPART')) {
        console.log('✅ Mapeamento Amil (palavra-chave):', planName, '→ Amil Coparticipação');
        return 'Amil Coparticipação';
      }
      if (normalizedPlan.includes('MEDICO')) {
        console.log('✅ Mapeamento Amil (palavra-chave):', planName, '→ Amil Médico');
        return 'Amil Médico';
      }
      if (normalizedPlan.includes('MEDICUS')) {
        const medicusMatch = normalizedPlan.match(/MEDICUS\s*(\d+)/);
        if (medicusMatch) {
          const result = `Amil Medicus ${medicusMatch[1]}`;
          console.log('✅ Mapeamento Amil (palavra-chave):', planName, '→', result);
          return result;
        }
        console.log('✅ Mapeamento Amil (palavra-chave):', planName, '→ Amil Medicus');
        return 'Amil Medicus';
      }
    }
    
    console.log('⚠️ Plano não mapeado:', planName, 'para operadora:', operator);
    return planName;
  }

  /**
   * Calcula score de confiança da extração
   */
  private calculateConfidence(data: ExtractedData): any {
    let score = 0;
    let total = 0;

    if (data.operadora) { score += 1; total += 1; }
    if (data.numeroCarteirinha) { score += 1; total += 1; }
    if (data.plano) { score += 0.8; total += 1; }
    if (data.nomeTitular) { score += 0.6; total += 1; }

    return {
      overall: total > 0 ? score / total : 0,
      operadora: data.operadora ? 1 : 0,
      plano: data.plano ? 0.8 : 0,
      numeroCarteirinha: data.numeroCarteirinha ? 1 : 0
    };
  }

  /**
   * Determina método de detecção usado
   */
  private getDetectionMethod(ansCode: string | null, operator: string): DetectionMethod {
    if (ansCode) {
      return {
        type: 'ANS_CODE',
        details: `Detectado via código ANS: ${ansCode}`
      };
    } else {
      return {
        type: 'TEXT_PATTERN',
        details: `Detectado via padrões de texto para: ${operator}`
      };
    }
  }

  /**
   * Busca operadora por código ANS
   * @param ansCode Código ANS extraído
   * @returns string | null Nome da operadora
   */
  private findOperatorByANS(ansCode: string): string | null {
    console.log('🔍 Buscando operadora por código ANS:', ansCode);
    
    // Mapeamento direto de códigos ANS conhecidos
    const ansMapping: Record<string, string> = {
      '000701': 'UNIMED',
      '6246': 'SULAMERICA', 
      '326305': 'AMIL',
      '582': 'PORTO',
      // Adicionar mais códigos conforme necessário
    };
    
    // Buscar código normalizado
    const normalizedCode = ANSDetector.normalizeANSCode(ansCode);
    const operator = ansMapping[normalizedCode] || ansMapping[ansCode];
    
    if (operator) {
      console.log('📋 Operadora encontrada via ANS:', ansCode, '→', operator);
      return operator;
    }
    
    console.log('⚠️ Código ANS não mapeado:', ansCode);
    return null;
  }

  /**
   * Normaliza nome da operadora para exibição
   */
  private getNormalizedOperatorName(detectedOperator: string): string {
    const mapping: Record<string, string> = {
      'SULAMERICA': 'Sul América',
      'BRADESCO': 'Bradesco',
      'UNIMED': 'Unimed',
      'AMIL': 'Amil',
      'PORTO': 'Porto Seguro'
    };
    return mapping[detectedOperator] || detectedOperator;
  }

  /**
   * Processa documento de identidade (RG) usando o orquestrador especializado
   */
  private async processIdentityDocument(cleanText: string, documentTypeResult: any): Promise<ExtractionResult> {
    FlowDebugger.enter('extraction-orchestrator.ts', 'processIdentityDocument', { textLength: cleanText.length });
    
    try {
      console.log('🆔 ORCHESTRATOR: Processando documento de identidade...');
      console.log('📋 ORCHESTRATOR: Subtipo detectado:', documentTypeResult.subtype);
      console.log('📊 ORCHESTRATOR: Confiança detecção:', (documentTypeResult.confidence * 100).toFixed(1) + '%');
      console.log('📝 ORCHESTRATOR: Texto limpo (primeiros 200 chars):', cleanText.substring(0, 200));

      // Delegar para o orquestrador de identidade
      console.log('🔄 ORCHESTRATOR: Delegando para IdentityOrchestrator...');
      FlowDebugger.transition('extraction-orchestrator.ts', 'processIdentityDocument', 'identity-orchestrator.ts', 'processIdentityDocument');
      const identityResult = await this.identityOrchestrator.processIdentityDocument(cleanText);
      FlowDebugger.data('extraction-orchestrator.ts', 'processIdentityDocument', 'Resultado da identidade', identityResult);

      console.log('📋 ORCHESTRATOR: Resultado do IdentityOrchestrator:', identityResult.success ? '✅ SUCESSO' : '❌ FALHA');
      if (identityResult.error) {
        console.log('🔍 ORCHESTRATOR: Erro encontrado:', identityResult.error);
      }

      if (!identityResult.success) {
        console.log('❌ ORCHESTRATOR: Falha no processamento - criando erro result');
        return this.createErrorResult(identityResult.error || 'Erro no processamento do RG');
      }

      // Converter resultado do RG para formato ExtractionResult compatível
      const result: ExtractionResult = {
        success: true,
        data: {
          // Campos de identidade
          nomeCompleto: identityResult.data?.fullName,
          rg: identityResult.data?.rg,
          cpf: identityResult.data?.cpf,
          dataNascimento: identityResult.data?.birthDate,
          nomeMae: identityResult.data?.filiation?.mother,
          nomePai: identityResult.data?.filiation?.father,
          naturalidade: identityResult.data?.birthPlace,
          dataExpedicao: identityResult.data?.issuedDate,
          orgaoExpedidor: identityResult.data?.issuedBy,
          documentoOrigem: identityResult.data?.documentOrigin,
          
          // Metadados do documento
          tipoDocumento: identityResult.data?.documentType,
          subtipoDocumento: identityResult.data?.subtype
        },
        confidence: {
          overall: identityResult.confidence?.overall || 0,
          operadora: 0, // N/A para RG
          plano: 0, // N/A para RG
          numeroCarteirinha: 0, // N/A para RG
          nome: identityResult.confidence?.name || 0,
          rg: identityResult.confidence?.rg || 0,
          cpf: identityResult.confidence?.cpf || 0,
          dataNascimento: identityResult.confidence?.birthDate || 0
        },
        method: {
          type: 'IDENTITY_EXTRACTOR',
          details: identityResult.method?.details || 'Processado com extrator de identidade'
        }
      };

      console.log('✅ Processamento de RG concluído');
      console.log('📋 Nome extraído:', result.data.nomeCompleto);
      console.log('📋 RG extraído:', result.data.rg);
      console.log('📋 CPF extraído:', result.data.cpf);
      console.log('📊 Confiança geral:', (result.confidence.overall * 100).toFixed(1) + '%');

      FlowDebugger.exit('extraction-orchestrator.ts', 'processIdentityDocument', result);
      return result;

    } catch (error) {
      FlowDebugger.error('extraction-orchestrator.ts', 'processIdentityDocument', error);
      console.error('❌ Erro no processamento do RG:', error);
      return this.createErrorResult(`Erro no processamento do RG: ${error}`);
    }
  }

  /**
   * Cria resultado de erro padronizado
   */
  private createErrorResult(message: string): ExtractionResult {
    return {
      success: false,
      data: {},
      confidence: { overall: 0, operadora: 0, plano: 0, numeroCarteirinha: 0 },
      method: { type: 'FALLBACK', details: 'Erro na extração' },
      errors: [message]
    };
  }

  /**
   * Extrai dados a partir de texto já extraído (evita OCR duplo)
   * Use este método quando o OCR já foi feito pelo DocumentExtractionManager
   */
  async processFromText(cleanText: string): Promise<UnifiedExtractionResult> {
    try {
      const detectedOperator = OperatorDetector.detectOperator(cleanText);
      
      if (!detectedOperator) {
        return UnifiedResultBuilder.error(
          DocumentType.CARTEIRINHA,
          'Operadora não identificada',
          { confidence: 0 }
        );
      }
      
      const ansCode = ANSDetector.extractANSCode(cleanText);
      const extractedData = await this.delegateToOperatorExtractor(detectedOperator, cleanText, ansCode);
      
      return UnifiedResultBuilder.success(
        DocumentType.CARTEIRINHA,
        {
          fullName: extractedData.nomeTitular,
          birthDate: extractedData.dataNascimento
        },
        {
          provider: extractedData.normalizedOperadora || detectedOperator,
          providerRaw: extractedData.operadora || detectedOperator,
          plan: extractedData.plano,
          cardNumber: extractedData.numeroCarteirinha,
          cns: extractedData.cns
        },
        {
          subtype: detectedOperator.toUpperCase(),
          confidence: this.calculateConfidence(extractedData).overall,
          method: `${detectedOperator}_EXTRACTOR_FROM_TEXT`
        }
      );
    } catch (error) {
      return UnifiedResultBuilder.error(
        DocumentType.CARTEIRINHA,
        error instanceof Error ? error.message : 'Erro na extração',
        { confidence: 0 }
      );
    }
  }

  /**
   * Extrai dados e retorna no formato unificado
   * Este é o método principal que deve ser usado pelo frontend
   */
  async processDocumentUnified(imageBuffer: Buffer): Promise<UnifiedExtractionResult> {
    const result = await this.processDocument(imageBuffer);
    
    if (!result.success) {
      return UnifiedResultBuilder.error(
        DocumentType.UNKNOWN,
        result.errors || ['Falha na extração'],
        { confidence: result.confidence.overall, method: result.method.details }
      );
    }

    // Determinar tipo de documento
    const isIdentity = result.data.tipoDocumento === 'RG_IDENTITY' || 
                       result.data.tipoDocumento === 'CNH_LICENSE' ||
                       result.method.type === 'IDENTITY_EXTRACTOR';
    
    if (isIdentity) {
      const docType = result.data.tipoDocumento === 'CNH_LICENSE' ? DocumentType.CNH : DocumentType.RG;
      return UnifiedResultBuilder.success(
        docType,
        {
          fullName: result.data.nomeCompleto,
          cpf: result.data.cpf,
          rg: result.data.rg,
          birthDate: result.data.dataNascimento,
          mothersName: result.data.nomeMae,
          fathersName: result.data.nomePai,
          birthPlace: result.data.naturalidade
        },
        undefined,
        {
          subtype: result.data.subtipoDocumento,
          confidence: result.confidence.overall,
          method: result.method.details
        }
      );
    }

    // Carteirinha de plano de saúde
    return UnifiedResultBuilder.success(
      DocumentType.CARTEIRINHA,
      {
        fullName: result.data.nomeTitular,
        birthDate: result.data.dataNascimento
      },
      {
        provider: result.data.normalizedOperadora || result.data.operadora,
        providerRaw: result.data.operadora,
        plan: result.data.plano,
        cardNumber: result.data.numeroCarteirinha,
        cns: result.data.cns
      },
      {
        subtype: result.data.operadora?.toUpperCase(),
        confidence: result.confidence.overall,
        method: result.method.details
      }
    );
  }
}