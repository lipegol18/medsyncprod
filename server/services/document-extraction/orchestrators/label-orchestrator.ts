/**
 * Label Orchestrator - Orquestrador para etiquetas hospitalares
 * 
 * Gerencia a extração de dados de diferentes tipos de etiquetas.
 * Atualmente suporta:
 * - Etiquetas de emergência (urgência)
 * 
 * Projetado para expansão futura com outros tipos de etiquetas.
 */

import { EmergencyLabelExtractor } from '../extractors/emergency-label-extractor';
import { UnifiedResultBuilder, type UnifiedExtractionResult } from '../types/unified-result-builder';
import { DocumentType, DocumentSubtype } from '../types/document-constants';

export type LabelType = 'EMERGENCY' | 'UNKNOWN';

export interface LabelDetectionResult {
  type: LabelType;
  confidence: number;
}

export class LabelOrchestrator {
  /**
   * Detecta o tipo de etiqueta baseado no texto
   */
  static detectLabelType(text: string): LabelDetectionResult {
    const normalizedText = text.toUpperCase();
    
    // Padrões para etiqueta de emergência
    const emergencyPatterns = [
      /LEITO\s*:\s*URGEN/i,
      /\bURGEN\b/,
      /ENT\s*:\s*\d{2}\/\d{2}\/\d{4}/i,
      /PRONT\s*\.\s*\d{6,}/i,
    ];
    
    const emergencyMatches = emergencyPatterns.filter(p => p.test(normalizedText)).length;
    
    if (emergencyMatches >= 2) {
      return {
        type: 'EMERGENCY',
        confidence: Math.min(0.95, 0.6 + emergencyMatches * 0.1)
      };
    }
    
    return { type: 'UNKNOWN', confidence: 0.3 };
  }
  
  /**
   * Processa a etiqueta e extrai dados unificados
   */
  static extractUnified(text: string): UnifiedExtractionResult {
    console.log('🏷️ [LabelOrchestrator] Iniciando processamento de etiqueta...');
    
    // Detectar tipo de etiqueta
    const detection = this.detectLabelType(text);
    console.log(`📋 [LabelOrchestrator] Tipo detectado: ${detection.type} (${(detection.confidence * 100).toFixed(0)}%)`);
    
    switch (detection.type) {
      case 'EMERGENCY':
        return this.processEmergencyLabel(text);
      default:
        return UnifiedResultBuilder.error(
          DocumentType.EMERGENCY_LABEL,
          'Tipo de etiqueta não reconhecido',
          { subtype: DocumentSubtype.EMERGENCY_LABEL_HOSPITAL, confidence: detection.confidence }
        );
    }
  }
  
  /**
   * Processa etiqueta de emergência
   */
  private static processEmergencyLabel(text: string): UnifiedExtractionResult {
    console.log('🚑 [LabelOrchestrator] Processando etiqueta de emergência...');
    
    try {
      const extractedData = EmergencyLabelExtractor.extract(text);
      
      // Verificar se extraiu campos mínimos
      const hasRequiredFields = extractedData.patient.fullName || 
                                extractedData.patient.birthDate;
      
      if (!hasRequiredFields) {
        return UnifiedResultBuilder.error(
          DocumentType.EMERGENCY_LABEL,
          'Não foi possível extrair dados suficientes da etiqueta',
          {
            subtype: DocumentSubtype.EMERGENCY_LABEL_HOSPITAL,
            confidence: extractedData.confidence
          }
        );
      }
      
      return UnifiedResultBuilder.success(
        DocumentType.EMERGENCY_LABEL,
        extractedData.patient,
        extractedData.insurance,
        {
          subtype: DocumentSubtype.EMERGENCY_LABEL_HOSPITAL,
          confidence: extractedData.confidence,
          method: 'EMERGENCY_LABEL_EXTRACTOR'
        }
      );
    } catch (error) {
      console.error('❌ [LabelOrchestrator] Erro na extração:', error);
      return UnifiedResultBuilder.error(
        DocumentType.EMERGENCY_LABEL,
        error instanceof Error ? error.message : 'Erro desconhecido na extração',
        { subtype: DocumentSubtype.EMERGENCY_LABEL_HOSPITAL }
      );
    }
  }
  
  /**
   * Processa etiqueta a partir de texto já extraído (usado pelo DocumentExtractionManager)
   */
  static async processFromText(text: string): Promise<UnifiedExtractionResult> {
    return this.extractUnified(text);
  }
}
