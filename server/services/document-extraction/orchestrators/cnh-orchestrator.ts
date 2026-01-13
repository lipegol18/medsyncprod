/**
 * Orquestrador CNH - Detecta a versão da CNH e delega para o extrator apropriado
 * 
 * Versões suportadas:
 * - CNH Clássica: Modelo antigo (antes de ~2022), labels tradicionais
 * - CNH Moderna: Novo modelo (após ~2022), labels numerados, bilíngue
 * - CNH Digital (CNH-e): Versão PDF com QR-Code, MRZ e dados institucionais
 */

import { IIdentityExtractor, ExtractedIdentityData } from '../extractors/identity-extractor-interface';
import { CNHClassicExtractor } from '../extractors/cnh-classic-extractor';
import { CNHModernExtractor } from '../extractors/cnh-modern-extractor';
import { CNHDigitalExtractor } from '../extractors/cnh-digital-extractor';

export type CNHVersion = 'CLASSIC' | 'MODERN' | 'DIGITAL' | 'UNKNOWN';

export interface CNHDetectionResult {
  version: CNHVersion;
  confidence: number;
  markers: string[];
}

export class CNHOrchestrator {
  private classicExtractor: CNHClassicExtractor;
  private modernExtractor: CNHModernExtractor;
  private digitalExtractor: CNHDigitalExtractor;
  
  constructor() {
    this.classicExtractor = new CNHClassicExtractor();
    this.modernExtractor = new CNHModernExtractor();
    this.digitalExtractor = new CNHDigitalExtractor();
  }
  
  /**
   * Verifica se o texto é uma CNH (qualquer versão)
   */
  canHandle(text: string): boolean {
    return this.classicExtractor.canHandle(text) || 
           this.modernExtractor.canHandle(text) ||
           this.digitalExtractor.canHandle(text);
  }
  
  /**
   * Detecta qual versão da CNH baseado em marcadores exclusivos
   * Ordem de prioridade: DIGITAL > MODERN > CLASSIC
   */
  detectVersion(text: string): CNHDetectionResult {
    const normalizedText = text.toUpperCase();
    const markers: string[] = [];
    
    // ═══════════════════════════════════════════════════════════════
    // FASE 1: Detectar CNH-e (Digital) - tem prioridade máxima
    // ═══════════════════════════════════════════════════════════════
    let digitalScore = 0;
    
    const digitalPatterns: [RegExp, string, number][] = [
      [/SENATRAN/, 'SENATRAN', 4],
      [/GOV\.?BR/, 'gov.br', 3],
      [/ASSINADOR\s*SERPRO/, 'Assinador Serpro', 4],
      [/SERPRO\.GOV\.BR/, 'serpro.gov.br', 3],
      [/DOCUMENTO\s*ASSINADO\s*COM\s*CERTIFICADO\s*DIGITAL/, 'Certificado Digital', 5],
      [/MEDIDA\s*PROVIS[ÓO]RIA\s*N[°º]?\s*2200/, 'MP 2200-2/2001', 4],
      [/QR[\-\s]?CODE/, 'QR-CODE', 3],
      [/I<BRA[A-Z0-9<]{20,}/, 'MRZ (I<BRA...)', 5],
      [/\d{6}[MF]\d{6}BRA/, 'MRZ (data/sexo)', 4],
      [/[A-Z]+<<[A-Z<]{10,}/, 'MRZ (nome)', 3],
      [/ORIENTA[ÇC][ÕO]ES\s*PARA\s*INSTALAR/, 'Instruções Serpro', 2],
    ];
    
    for (const [pattern, label, weight] of digitalPatterns) {
      if (pattern.test(normalizedText)) {
        digitalScore += weight;
        markers.push(`[DIGITAL] ${label}`);
      }
    }
    
    // Se detectou CNH-e com alta confiança, retorna imediatamente
    if (digitalScore >= 8) {
      console.log(`🔍 [CNH-Orchestrator] CNH-e detectada (score: ${digitalScore})`);
      return {
        version: 'DIGITAL',
        confidence: Math.min(digitalScore / 20 * 100, 98),
        markers
      };
    }
    
    // ═══════════════════════════════════════════════════════════════
    // FASE 2: Detectar entre Modern e Classic
    // ═══════════════════════════════════════════════════════════════
    let modernScore = 0;
    let classicScore = 0;
    
    const modernPatterns: [RegExp, string, number][] = [
      [/DRIVER\s*LICENSE/, 'DRIVER LICENSE', 3],
      [/PERMISO\s*DE\s*CONDUCCI/, 'PERMISO DE CONDUCCIÓN', 3],
      [/NOME\s*E\s*SOBRENOME/, 'NOME E SOBRENOME', 3],
      [/2\s*E\s*1\s*NOME/, '2 e 1 NOME', 3],
      [/DATA,?\s*LOCAL\s*E\s*UF/, 'DATA, LOCAL E UF', 2],
      [/4[A-D]\s*(DATA|CPF|DOC|VALIDADE)/i, '4x LABELS (4a,4b,4c,4d)', 3],
      [/5\s*N[°º]?\s*REGISTRO/, '5 Nº REGISTRO', 2],
      [/9\s*CAT\s*HAB/, '9 CAT HAB', 2],
      [/NACIONALIDADE/, 'NACIONALIDADE', 2],
      [/SECRETARIA\s*NACIONAL\s*DE\s*TR[ÂA]NSITO/, 'SECRETARIA NACIONAL DE TRÂNSITO', 2],
      [/BRASILEIRO\s*\(A\)/, 'BRASILEIRO(A)', 2],
      [/MINISTERIO\s*DOS\s*TRANSPORTES/, 'MINISTÉRIO DOS TRANSPORTES', 1],
    ];
    
    const classicPatterns: [RegExp, string, number][] = [
      [/OBSERVA[ÇC][ÕO]ES/, 'OBSERVAÇÕES', 3],
      [/ASSINATURA\s*DO\s*EMISSOR/, 'ASSINATURA DO EMISSOR', 3],
      [/LOCAL\s*[\n\r]+[A-Z]+,?\s*[A-Z]{2}/, 'LOCAL + CIDADE/UF', 2],
      [/DATA\s*EMISS[ÃA]O\s*[\n\r]+\d{2}\/\d{2}\/\d{4}/, 'DATA EMISSÃO inline', 2],
      [/N[°º]?\s*REGISTRO\s*[\n\r]+\d{10,11}/, 'Nº REGISTRO (formato antigo)', 2],
      [/DETRAN,?\s*[A-Z]{2}/, 'DETRAN + UF', 2],
      [/PERMISS[ÃA]O\s*ACC/, 'PERMISSÃO ACC', 1],
      [/1[ªa]\s*HABILITA[ÇC][ÃA]O/, '1ª HABILITAÇÃO', 1],
      [/MINISTERIO\s*DAS\s*CIDADES/, 'MINISTÉRIO DAS CIDADES', 2],
      [/MINISTERIO\s*DA\s*INFRAESTRUTURA/, 'MINISTÉRIO DA INFRAESTRUTURA', 2],
      [/ESP[IÍ]RITO\s*SANTO|RIO\s*DE\s*JANEIRO|S[ÃA]O\s*PAULO/, 'ESTADO (footer)', 1],
    ];
    
    for (const [pattern, label, weight] of modernPatterns) {
      if (pattern.test(normalizedText)) {
        modernScore += weight;
        markers.push(`[MODERN] ${label}`);
      }
    }
    
    for (const [pattern, label, weight] of classicPatterns) {
      if (pattern.test(normalizedText)) {
        classicScore += weight;
        markers.push(`[CLASSIC] ${label}`);
      }
    }
    
    console.log(`🔍 [CNH-Orchestrator] Scores - Digital: ${digitalScore}, Modern: ${modernScore}, Classic: ${classicScore}`);
    console.log(`🔍 [CNH-Orchestrator] Marcadores encontrados:`, markers);
    
    // Se tem score digital parcial + modern, pode ser CNH-e com imagem
    if (digitalScore >= 4 && modernScore >= 3) {
      return {
        version: 'DIGITAL',
        confidence: Math.min((digitalScore + modernScore) / 25 * 100, 95),
        markers
      };
    }
    
    const totalScore = modernScore + classicScore;
    
    if (modernScore > classicScore && modernScore >= 5) {
      return {
        version: 'MODERN',
        confidence: Math.min(modernScore / 15 * 100, 98),
        markers
      };
    } else if (classicScore > modernScore && classicScore >= 3) {
      return {
        version: 'CLASSIC',
        confidence: Math.min(classicScore / 12 * 100, 98),
        markers
      };
    } else if (totalScore > 0) {
      return {
        version: modernScore >= classicScore ? 'MODERN' : 'CLASSIC',
        confidence: Math.min(Math.max(modernScore, classicScore) / 10 * 100, 70),
        markers
      };
    }
    
    return {
      version: 'UNKNOWN',
      confidence: 0,
      markers
    };
  }
  
  /**
   * Extrai dados da CNH usando o extrator apropriado
   */
  async extract(text: string): Promise<ExtractedIdentityData> {
    console.log('🚗 [CNH-Orchestrator] Iniciando extração...');
    
    const detection = this.detectVersion(text);
    console.log(`🚗 [CNH-Orchestrator] Versão detectada: ${detection.version} (${detection.confidence.toFixed(0)}%)`);
    
    let extractor: IIdentityExtractor;
    
    switch (detection.version) {
      case 'DIGITAL':
        console.log('🚗 [CNH-Orchestrator] Usando extrator CNH-e (DIGITAL)');
        extractor = this.digitalExtractor;
        break;
      case 'MODERN':
        console.log('🚗 [CNH-Orchestrator] Usando extrator MODERNO');
        extractor = this.modernExtractor;
        break;
      case 'CLASSIC':
        console.log('🚗 [CNH-Orchestrator] Usando extrator CLÁSSICO');
        extractor = this.classicExtractor;
        break;
      default:
        console.log('🚗 [CNH-Orchestrator] Versão desconhecida, tentando MODERNO como fallback');
        extractor = this.modernExtractor;
    }
    
    const result = await extractor.extract(text);
    
    return {
      ...result,
      _cnhVersion: detection.version,
      _cnhConfidence: detection.confidence,
    } as ExtractedIdentityData;
  }
  
  getConfidence(data: ExtractedIdentityData): number {
    const version = (data as any)._cnhVersion;
    if (version === 'DIGITAL') {
      return this.digitalExtractor.getConfidence(data);
    } else if (version === 'MODERN') {
      return this.modernExtractor.getConfidence(data);
    }
    return this.classicExtractor.getConfidence(data);
  }
}

export { CNHClassicExtractor } from '../extractors/cnh-classic-extractor';
export { CNHModernExtractor } from '../extractors/cnh-modern-extractor';
export { CNHDigitalExtractor } from '../extractors/cnh-digital-extractor';
