import { GoogleVisionOCREngine } from '../core/ocr-engine';
import { TextPreprocessor } from '../core/text-preprocessor';
import { ImagePreprocessor } from '../core/image-preprocessor';
import { DocumentTypeDetector, DocumentType } from '../detectors/document-type-detector';
import { InsuranceOrchestrator } from '../orchestrators/insurance-orchestrator';
import { IdentityOrchestrator } from '../orchestrators/identity-orchestrator';
import { MVOrchestrator } from '../orchestrators/mv-orchestrator';
import { UnifiedResultBuilder, type UnifiedExtractionResult, type UnifiedInsuranceData } from '../types/unified-result-builder';
import { DocumentType as DocType } from '../types/document-constants';

export interface ExtractionOptions {
  usePreprocessing?: boolean;
  returnRawText?: boolean;
  returnProcessedImage?: boolean;
}

export interface ExtractionContext {
  rawText: string;
  cleanedText: string;
  imageBuffer: Buffer;
  processedBuffer?: Buffer;
  preprocessingInfo?: {
    appliedOperations: string[];
    isScreenPhoto: boolean;
    originalSize: { width: number; height: number };
    processedSize: { width: number; height: number };
  };
}

interface DetectionInfo {
  type: DocumentType;
  subtype: string | undefined;
  confidence: number;
}

interface OrchestratorRegistry {
  type: DocumentType;
  canHandle: (detectedType: DocumentType) => boolean;
  extract: (context: ExtractionContext) => Promise<UnifiedExtractionResult>;
}

export class DocumentExtractionManager {
  private ocrEngine: GoogleVisionOCREngine;
  private insuranceOrchestrator: InsuranceOrchestrator;
  private identityOrchestrator: IdentityOrchestrator;
  private registry: OrchestratorRegistry[];

  constructor() {
    this.ocrEngine = new GoogleVisionOCREngine();
    this.insuranceOrchestrator = new InsuranceOrchestrator();
    this.identityOrchestrator = new IdentityOrchestrator();

    this.registry = [
      {
        type: 'INSURANCE_CARD',
        canHandle: (type) => type === 'INSURANCE_CARD',
        extract: async (ctx) => this.extractInsurance(ctx),
      },
      {
        type: 'RG_IDENTITY',
        canHandle: (type) => type === 'RG_IDENTITY',
        extract: async (ctx) => this.extractIdentity(ctx, 'RG'),
      },
      {
        type: 'CNH_LICENSE',
        canHandle: (type) => type === 'CNH_LICENSE',
        extract: async (ctx) => this.extractIdentity(ctx, 'CNH'),
      },
      {
        type: 'MV_PATIENT_SCREEN',
        canHandle: (type) => type === 'MV_PATIENT_SCREEN',
        extract: async (ctx) => this.extractMV(ctx),
      },
    ];
  }

  async extractUnified(
    imageBuffer: Buffer,
    options: ExtractionOptions = {}
  ): Promise<UnifiedExtractionResult> {
    const { usePreprocessing = true, returnProcessedImage = false } = options;

    console.log('🎯 [DocumentManager] Iniciando extração unificada...');

    try {
      const context = await this.buildContext(imageBuffer, usePreprocessing);

      console.log('🔍 [DocumentManager] Detectando tipo de documento...');
      const detection = DocumentTypeDetector.detectDocumentType(context.cleanedText);
      console.log(`📋 [DocumentManager] Tipo: ${detection.type} (${Math.round(detection.confidence * 100)}%)`);

      const detectionInfo: DetectionInfo = {
        type: detection.type,
        subtype: detection.subtype || undefined,
        confidence: detection.confidence,
      };

      const handler = this.registry.find((r) => r.canHandle(detection.type));

      if (!handler) {
        console.log('❌ [DocumentManager] Tipo de documento não suportado');
        return UnifiedResultBuilder.unknown('Tipo de documento não identificado', {
          preprocessing: context.preprocessingInfo,
        });
      }

      console.log(`✅ [DocumentManager] Delegando para handler: ${handler.type}`);
      const result = await handler.extract(context);

      const enrichedResult = this.enrichWithDetectionInfo(result, detectionInfo);

      // Incluir rawText no resultado
      enrichedResult.rawText = context.cleanedText;

      if (returnProcessedImage && context.preprocessingInfo) {
        return {
          ...enrichedResult,
          preprocessing: context.preprocessingInfo,
        };
      }

      return enrichedResult;
    } catch (error) {
      console.error('❌ [DocumentManager] Erro na extração:', error);
      return UnifiedResultBuilder.error(
        DocType.UNKNOWN,
        error instanceof Error ? error.message : 'Erro desconhecido na extração'
      );
    }
  }

  private enrichWithDetectionInfo(
    result: UnifiedExtractionResult,
    detection: DetectionInfo
  ): UnifiedExtractionResult {
    return {
      ...result,
      metadata: {
        ...result.metadata,
        documentType: detection.type as any,
        subtype: detection.subtype || result.metadata.subtype,
        confidence: Math.max(result.metadata.confidence, detection.confidence),
      },
    };
  }

  private async buildContext(
    imageBuffer: Buffer,
    usePreprocessing: boolean
  ): Promise<ExtractionContext> {
    let processedBuffer: Buffer = imageBuffer;
    let preprocessingInfo: ExtractionContext['preprocessingInfo'];

    if (usePreprocessing) {
      console.log('🖼️ [DocumentManager] Aplicando pré-processamento...');
      const isScreenPhoto = await ImagePreprocessor.detectIfScreenPhoto(imageBuffer);

      if (isScreenPhoto) {
        console.log('📸 [DocumentManager] Detectada foto de tela');
        const result = await ImagePreprocessor.preprocessForScreenPhoto(imageBuffer);
        processedBuffer = result.buffer;
        preprocessingInfo = {
          appliedOperations: result.appliedOperations,
          isScreenPhoto: true,
          originalSize: result.originalSize,
          processedSize: result.processedSize,
        };
      } else {
        const result = await ImagePreprocessor.preprocess(imageBuffer);
        processedBuffer = result.buffer;
        preprocessingInfo = {
          appliedOperations: result.appliedOperations,
          isScreenPhoto: false,
          originalSize: result.originalSize,
          processedSize: result.processedSize,
        };
      }
    }

    console.log('🔍 [DocumentManager] Extraindo texto via OCR...');
    const rawText = await this.ocrEngine.extractText(processedBuffer);
    const cleanedText = TextPreprocessor.cleanText(rawText);

    return {
      rawText,
      cleanedText,
      imageBuffer,
      processedBuffer,
      preprocessingInfo,
    };
  }

  private async extractInsurance(context: ExtractionContext): Promise<UnifiedExtractionResult> {
    console.log('🏥 [DocumentManager] Processando carteirinha de plano (reutilizando OCR)...');
    return await this.insuranceOrchestrator.processFromText(context.cleanedText);
  }

  private async extractIdentity(
    context: ExtractionContext,
    docType: 'RG' | 'CNH'
  ): Promise<UnifiedExtractionResult> {
    console.log(`🪪 [DocumentManager] Processando ${docType}...`);
    return await this.identityOrchestrator.extractUnified(context.cleanedText);
  }

  private async extractMV(context: ExtractionContext): Promise<UnifiedExtractionResult> {
    console.log('🏨 [DocumentManager] Processando tela MV com extração híbrida...');

    const resultProcessed = MVOrchestrator.extractUnified(context.cleanedText);
    let resultOriginal: UnifiedExtractionResult | null = null;

    if (context.processedBuffer && context.imageBuffer !== context.processedBuffer) {
      console.log('🔍 [DocumentManager] Extraindo da imagem original para merge...');
      const rawTextOriginal = await this.ocrEngine.extractText(context.imageBuffer);
      resultOriginal = MVOrchestrator.extractUnified(rawTextOriginal);
    }

    if (resultOriginal) {
      return this.mergeMVResults(resultProcessed, resultOriginal);
    }

    return resultProcessed;
  }

  private mergeMVResults(
    primary: UnifiedExtractionResult,
    secondary: UnifiedExtractionResult
  ): UnifiedExtractionResult {
    const merged = { ...primary, patient: { ...primary.patient } };

    // Copiar address de primary se existir
    if (primary.patient?.address) {
      merged.patient.address = { ...primary.patient.address };
    }

    if (secondary.patient) {
      for (const [key, value] of Object.entries(secondary.patient)) {
        // Tratamento especial para address (objeto aninhado)
        if (key === 'address' && typeof value === 'object' && value !== null) {
          if (!merged.patient.address) {
            merged.patient.address = { ...value };
            console.log(`🔀 [DocumentManager] Campo patient.address inteiro copiado do resultado secundário`);
          } else {
            // Merge campo a campo do endereço
            for (const [addrKey, addrValue] of Object.entries(value)) {
              if (addrValue && !(merged.patient.address as any)[addrKey]) {
                (merged.patient.address as any)[addrKey] = addrValue;
                console.log(`🔀 [DocumentManager] Campo patient.address.${addrKey} preenchido do resultado secundário`);
              }
            }
          }
        } else if (value && !merged.patient[key as keyof typeof merged.patient]) {
          (merged.patient as any)[key] = value;
          console.log(`🔀 [DocumentManager] Campo patient.${key} preenchido do resultado secundário`);
        }
      }
    }

    if (secondary.insurance) {
      if (!merged.insurance) {
        merged.insurance = { ...secondary.insurance };
        console.log('🔀 [DocumentManager] Insurance inteiro copiado do resultado secundário');
      } else {
        for (const [key, value] of Object.entries(secondary.insurance)) {
          if (value && !merged.insurance[key as keyof UnifiedInsuranceData]) {
            (merged.insurance as any)[key] = value;
            console.log(`🔀 [DocumentManager] Campo insurance.${key} preenchido do resultado secundário`);
          }
        }
      }
    }

    const primaryConf = primary.metadata?.confidence || 0;
    const secondaryConf = secondary.metadata?.confidence || 0;
    
    merged.metadata = {
      ...primary.metadata,
      confidence: Math.max(primaryConf, secondaryConf),
    };

    merged.success = primary.success || secondary.success;

    return merged;
  }
}

export const documentExtractionManager = new DocumentExtractionManager();
