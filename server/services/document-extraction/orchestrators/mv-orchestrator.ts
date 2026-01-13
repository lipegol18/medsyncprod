
 
/**
 * MV Orchestrator - Orquestra a extração de dados de telas do sistema MV
 * Detecta o subtipo de tela MV e direciona para o extractor apropriado
 */

import { MVChnExtractor } from '../extractors/mv-chn-extractor';
import type { MVExtractionResult, MVPatientData, MVInsuranceData } from '../extractors/mv-chn-extractor';
import { MVAdvExtractor } from '../extractors/mv-adv-extractor';
import type { UnifiedExtractionResult } from '../types/extraction-types';
import { UnifiedResultBuilder, DocumentType } from '../types/unified-result-builder';

export type MVScreenType = 'MV_CHN' | 'MV_ADV' | 'MV_UNKNOWN';

export interface MVSubtypeDetectionResult {
  subtype: MVScreenType;
  confidence: number;
  markers: string[];
}

export class MVOrchestrator {
  /**
   * Detecta o subtipo de tela MV usando sistema de pontuação ponderada
   * 
   * Estratégia:
   * - Marcadores de endereço estruturado (Logradouro, Bairro, Cidade) = ADV exclusivo (+5)
   * - Marcadores de tabela/filtro (Lista de atendimentos, Filtro) = ADV exclusivo (+4)
   * - Campos demográficos (Naturalidade, Tipo sanguíneo, etc.) = NEUTRO (aparecem em ambos)
   * - ADV requer: score ≥6 E pelo menos 2 marcadores exclusivos distintos
   * - Caso contrário = CHN (padrão)
   */
  static detectSubtype(text: string): MVSubtypeDetectionResult {
    const upperText = text.toUpperCase();
    const markers: string[] = [];
    let advScore = 0;
    let advExclusiveCount = 0;
    
    // ========================================
    // MARCADORES DE ENDEREÇO ESTRUTURADO (peso +5)
    // São campos de formulário separados, exclusivos do ADV
    // CHN mostra endereço como texto corrido numa linha só
    // ========================================
    const addressFieldMarkers = [
      'LOGRADOURO',
      'COMPLEMENTO',
      'BAIRRO',
    ];
    
    for (const marker of addressFieldMarkers) {
      if (upperText.includes(marker)) {
        advScore += 5;
        advExclusiveCount++;
        markers.push(`ADV-ENDEREÇO (+5): ${marker}`);
      }
    }
    
    // Seção "Endereço Residencial" como título
    if (upperText.includes('ENDEREÇO RESIDENCIAL') || upperText.includes('ENDERECO RESIDENCIAL')) {
      advScore += 5;
      advExclusiveCount++;
      markers.push('ADV-SEÇÃO (+5): ENDEREÇO RESIDENCIAL');
    }
    
    // ========================================
    // MARCADORES DE TABELA/FILTRO (peso +4)
    // Interface de listagem exclusiva do ADV
    // ========================================
    if (upperText.includes('LISTA DE ATENDIMENTOS')) {
      advScore += 4;
      advExclusiveCount++;
      markers.push('ADV-TABELA (+4): LISTA DE ATENDIMENTOS');
    }
    
    if (upperText.includes('FILTRO DE ATENDIMENTOS')) {
      advScore += 4;
      advExclusiveCount++;
      markers.push('ADV-TABELA (+4): FILTRO DE ATENDIMENTOS');
    }
    
    // Dropdown "Últimos X atendimentos"
    if (/[ÚU]LTIMOS?\s+\d+\s+ATENDIMENTOS?/i.test(upperText)) {
      advScore += 4;
      advExclusiveCount++;
      markers.push('ADV-FILTRO (+4): ÚLTIMOS X ATENDIMENTOS');
    }
    
    // ========================================
    // MARCADORES SECUNDÁRIOS (peso +2)
    // ========================================
    if (upperText.includes('DATA DO ATENDIMENTO') && 
        (upperText.includes('DATA DA ALTA') || upperText.includes('PREVISÃO DE ALTA') || upperText.includes('PREVISAO DE ALTA'))) {
      advScore += 2;
      markers.push('ADV-CABEÇALHO (+2): DATA DO ATENDIMENTO + ALTA');
    }
    
    const secondaryAdvMarkers = [
      'TELEFONE PARA CONTATO',
      'CARTÃO NACIONAL DE SAÚDE',
      'CARTAO NACIONAL DE SAUDE',
      'MÉDICO DE REFERÊNCIA',
      'MEDICO DE REFERENCIA',
      'UNIDADE DE REFERÊNCIA',
      'UNIDADE DE REFERENCIA',
      'SUBPLANO',
    ];
    
    for (const marker of secondaryAdvMarkers) {
      if (upperText.includes(marker)) {
        advScore += 2;
        markers.push(`ADV-SECUNDÁRIO (+2): ${marker}`);
      }
    }
    
    // ========================================
    // CAMPOS NEUTROS (peso 0) - aparecem em AMBOS layouts
    // Registra para debug mas NÃO conta para score
    // ========================================
    const neutralFields = [
      'NATURALIDADE', 'NACIONALIDADE', 'TIPO SANGUÍNEO', 'TIPO SANGUINEO',
      'PROFISSÃO', 'PROFISSAO', 'RELIGIÃO', 'RELIGIAO', 'ESCOLARIDADE',
      'ESTADO CIVIL', 'RAÇA', 'RACA',
    ];
    
    for (const field of neutralFields) {
      if (upperText.includes(field)) {
        markers.push(`NEUTRO (0): ${field}`);
      }
    }
    
    // ========================================
    // DECISÃO FINAL
    // ADV requer: score ≥6 E pelo menos 2 marcadores exclusivos
    // ========================================
    
    console.log(`🏨 [MV-Orchestrator] Score ADV: ${advScore}, Marcadores exclusivos: ${advExclusiveCount}`);
    console.log(`🏨 [MV-Orchestrator] Marcadores encontrados:`, markers);
    
    if (advScore >= 6 && advExclusiveCount >= 2) {
      const confidence = Math.min(0.98, 0.70 + (advScore * 0.02) + (advExclusiveCount * 0.05));
      console.log(`🏨 [MV-Orchestrator] → MV_ADV (score=${advScore}, exclusivos=${advExclusiveCount}, confiança=${(confidence * 100).toFixed(0)}%)`);
      
      return {
        subtype: 'MV_ADV',
        confidence,
        markers,
      };
    }
    
    // Caso intermediário: tem alguns marcadores mas não suficientes
    if (advScore >= 4 && advExclusiveCount >= 1) {
      console.log(`🏨 [MV-Orchestrator] → MV_CHN (score ADV insuficiente: ${advScore} < 6 ou exclusivos: ${advExclusiveCount} < 2)`);
      markers.push(`DECISÃO: Score ADV (${advScore}) insuficiente, requer ≥6 com ≥2 exclusivos`);
      
      return {
        subtype: 'MV_CHN',
        confidence: 0.60,
        markers,
      };
    }
    
    // Padrão: CHN (nenhum marcador ADV)
    markers.push('DECISÃO: Nenhum marcador ADV exclusivo → CHN');
    console.log(`🏨 [MV-Orchestrator] → MV_CHN (padrão)`);
    
    return {
      subtype: 'MV_CHN',
      confidence: 0.75,
      markers,
    };
  }
  
  /**
   * Extrai dados da tela MV usando o extractor apropriado
   */
  static extract(text: string): MVExtractionResult & { subtype: MVScreenType } {
    const detection = this.detectSubtype(text);
    
    console.log(`🏨 [MV-Orchestrator] Subtipo detectado: ${detection.subtype} (${(detection.confidence * 100).toFixed(0)}%)`);
    
    let result: MVExtractionResult;
    
    switch (detection.subtype) {
      case 'MV_CHN':
        result = MVChnExtractor.extract(text);
        break;
        
      case 'MV_ADV':
        result = MVAdvExtractor.extract(text);
        break;
        
      default:
        result = MVChnExtractor.extract(text);
    }
    
    return {
      ...result,
      subtype: detection.subtype,
    };
  }

  /**
   * Extrai dados e retorna no formato unificado
   * Este é o método principal que deve ser usado pelo frontend
   */
  static extractUnified(text: string): UnifiedExtractionResult {
    const result = this.extract(text);
    const subtype = result.subtype || 'MV_UNKNOWN';
    
    if (!result.success) {
      return UnifiedResultBuilder.error(
        DocumentType.MV_PATIENT_SCREEN,
        result.errors,
        { subtype, confidence: result.confidence }
      );
    }

    // Converter sexo para formato padronizado
    let gender: 'M' | 'F' | undefined;
    if (result.patient.sexo) {
      const sexoNorm = result.patient.sexo.toUpperCase();
      if (sexoNorm === 'M' || sexoNorm === 'MASCULINO') gender = 'M';
      else if (sexoNorm === 'F' || sexoNorm === 'FEMININO') gender = 'F';
    }

    // Mapear endereço se existir
    const address = result.patient.endereco ? {
      logradouro: result.patient.endereco.logradouro,
      numero: result.patient.endereco.numero,
      complemento: result.patient.endereco.complemento,
      bairro: result.patient.endereco.bairro,
      cidade: result.patient.endereco.cidade,
      estado: result.patient.endereco.estado,
      cep: result.patient.endereco.cep
    } : undefined;

    return UnifiedResultBuilder.success(
      DocumentType.MV_PATIENT_SCREEN,
      {
        fullName: result.patient.nome,
        cpf: result.patient.cpf,
        rg: result.patient.rg,
        birthDate: result.patient.dataNascimento,
        gender,
        phone: result.patient.telefone,
        email: result.patient.email,
        mothersName: result.patient.nomeMae,
        fathersName: result.patient.nomePai,
        birthPlace: result.patient.naturalidade,
        nationality: result.patient.nacionalidade,
        address
      },
      {
        provider: result.insurance.convenio,
        providerRaw: result.insurance.convenio,
        plan: result.insurance.plano || result.insurance.subplano,
        cardNumber: result.insurance.numeroCarteira,
        cns: result.insurance.cns
      },
      { subtype, confidence: result.confidence }
    );
  }
}

export { MVExtractionResult, MVPatientData, MVInsuranceData };
