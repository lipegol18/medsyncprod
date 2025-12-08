import { ExtractionOrchestrator } from './core/extraction-orchestrator';
import { GoogleVisionOCREngine } from './core/ocr-engine';
import { IdentityOrchestrator, IdentityExtractionResult } from './identity-extractors/identity-orchestrator';
import { ExtractionResult } from './types/extraction-types';

/**
 * Interface de compatibilidade com sistema legado
 * Mantida para não quebrar imports existentes em data-normalizer.ts
 */
export interface ExtractedDocumentData {
  fullName?: string;
  idNumber?: string;
  birthDate?: string;
  gender?: string;
  operadora?: string;
  ansCode?: string;
  numeroCarteirinha?: string;
  nomeTitular?: string;
  plano?: string;
  cpf?: string;
  cns?: string;
  rg?: string;
  dataNascimento?: string;
  sexo?: string;
  naturalidade?: string;
}

/**
 * Interface principal do sistema de extração de documentos
 * Suporta carteirinhas de plano de saúde e documentos de identidade (RG/CNH)
 */
export class DocumentExtractionService {
  private orchestrator: ExtractionOrchestrator;
  private ocrEngine: GoogleVisionOCREngine;
  private identityOrchestrator: IdentityOrchestrator;

  constructor() {
    this.orchestrator = new ExtractionOrchestrator();
    this.ocrEngine = new GoogleVisionOCREngine();
    this.identityOrchestrator = new IdentityOrchestrator();
  }

  /**
   * Extrai texto de uma imagem usando OCR
   * @param imageBuffer Buffer da imagem
   * @returns Promise<string> Texto extraído
   */
  async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    console.log('🔍 Extraindo texto da imagem...');
    return await this.ocrEngine.extractText(imageBuffer);
  }

  /**
   * Processa documento de carteirinha de plano de saúde
   * @param imageBuffer Buffer da imagem
   * @returns Promise<ExtractionResult> Resultado estruturado da extração
   */
  async processInsuranceCard(imageBuffer: Buffer): Promise<ExtractionResult> {
    console.log('📋 Processando carteirinha de plano de saúde...');
    return await this.orchestrator.processDocument(imageBuffer);
  }

  /**
   * Processa documento de identidade (RG/CNH)
   * @param extractedText Texto já extraído da imagem
   * @returns Promise<ExtractedDocumentData> Dados extraídos no formato compatível
   */
  async processIdentityDocument(extractedText: string): Promise<ExtractedDocumentData> {
    console.log('🆔 Processando documento de identidade...');
    
    const result = await this.identityOrchestrator.processIdentityDocument(extractedText);
    
    // Converter para formato compatível (ExtractedDocumentData)
    return {
      fullName: result.data?.fullName,
      rg: result.data?.rg,
      cpf: result.data?.cpf,
      birthDate: result.data?.birthDate,
      dataNascimento: result.data?.birthDate,
      naturalidade: result.data?.birthPlace
    };
  }

  /**
   * Processa documento de identidade a partir de imagem
   * @param imageBuffer Buffer da imagem
   * @returns Promise<ExtractedDocumentData> Dados extraídos
   */
  async processIdentityDocumentFromImage(imageBuffer: Buffer): Promise<ExtractedDocumentData> {
    console.log('🆔 Processando documento de identidade a partir de imagem...');
    
    // Passo 1: Extrair texto da imagem
    const extractedText = await this.extractTextFromImage(imageBuffer);
    
    // Passo 2: Processar texto extraído
    return await this.processIdentityDocument(extractedText);
  }

  /**
   * Método de compatibilidade para manter interface atual
   * Converte resultado novo para formato esperado pelo sistema atual
   */
  async processInsuranceCardLegacy(imageBuffer: Buffer): Promise<any> {
    const result = await this.processInsuranceCard(imageBuffer);
    
    if (!result.success) {
      throw new Error(result.errors?.join(', ') || 'Erro na extração');
    }

    // Converter para formato legacy esperado pelo sistema atual fffrr
    return {
      success: true,
      extractedText: 'Texto processado pela nova arquitetura',
      data: {
        ansCode: result.data.ansCode,
        nomeTitular: result.data.nomeTitular,
        dataNascimento: result.data.dataNascimento,
        plano: result.data.plano,
        numeroCarteirinha: result.data.numeroCarteirinha,
        cns: result.data.cns,
        operadora: result.data.operadora,
        confidence: result.confidence,
        method: result.method
      }
    };
  }
}

// Instância singleton para uso no sistema
export const documentExtractionService = new DocumentExtractionService();
