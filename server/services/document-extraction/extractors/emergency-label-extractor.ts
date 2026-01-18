/**
 * Extrator de Etiquetas de Emergência Hospitalar
 *
 * Extrai dados de pacientes a partir de etiquetas impressas
 * na entrada da urgência hospitalar.
 *
 * Campos extraídos:
 * - Nome do Paciente (primeira linha)
 * - Data de Nascimento (Nasc.: DD/MM/YYYY)
 * - Operadora de Seguro (linha após Pront.)
 * - Sexo (Sexo: F ou M)
 */

import type {
  UnifiedPatientData,
  UnifiedInsuranceData,
} from "../types/unified-result-builder";

export interface EmergencyLabelData {
  patient: UnifiedPatientData;
  insurance?: UnifiedInsuranceData;
  confidence: number;
}

export class EmergencyLabelExtractor {
  /**
   * Extrai dados da etiqueta de emergência a partir do texto OCR
   */
  static extract(text: string): EmergencyLabelData {
    console.log("🏷️ [EmergencyLabelExtractor] Iniciando extração...");

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    console.log(
      `📄 [EmergencyLabelExtractor] ${lines.length} linhas para processar`,
    );

    const patient: UnifiedPatientData = {};
    const insurance: UnifiedInsuranceData = {};
    let fieldsFound = 0;

    // 1. Extrair Nome do Paciente (primeira linha válida)
    const patientName = this.extractPatientName(lines);
    if (patientName) {
      patient.fullName = patientName;
      fieldsFound++;
      console.log(`✅ [EmergencyLabelExtractor] Nome: ${patientName}`);
    }

    // 2. Extrair Data de Nascimento
    const birthDate = this.extractBirthDate(text);
    if (birthDate) {
      patient.birthDate = birthDate;
      fieldsFound++;
      console.log(`✅ [EmergencyLabelExtractor] Nascimento: ${birthDate}`);
    }

    // 3. Extrair Sexo
    const gender = this.extractGender(text);
    if (gender) {
      patient.gender = gender;
      fieldsFound++;
      console.log(`✅ [EmergencyLabelExtractor] Sexo: ${gender}`);
    }

    // 4. Extrair Operadora de Seguro
    const insuranceProvider = this.extractInsuranceProvider(text, lines);
    if (insuranceProvider) {
      insurance.provider = insuranceProvider;
      insurance.providerRaw = insuranceProvider;
      fieldsFound++;
      console.log(
        `✅ [EmergencyLabelExtractor] Operadora: ${insuranceProvider}`,
      );
    }

    // Calcular confiança baseada nos campos encontrados
    const confidence = Math.min(0.95, 0.4 + fieldsFound * 0.15);
    console.log(
      `📊 [EmergencyLabelExtractor] Campos: ${fieldsFound}/4, Confiança: ${(confidence * 100).toFixed(0)}%`,
    );

    return {
      patient,
      insurance: Object.keys(insurance).length > 0 ? insurance : undefined,
      confidence,
    };
  }

  /**
   * Extrai o nome do paciente (pode ocupar até 2 linhas antes de NSocial)
   */
  private static extractPatientName(lines: string[]): string | undefined {
    // Estratégia principal: Juntar todas as linhas antes de "NSocial"
    // O nome pode ocupar 1 ou 2 linhas, sempre terminando antes de NSocial

    // Encontrar o índice da linha NSocial
    let nsocialIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^NSOCIAL/i.test(lines[i])) {
        nsocialIndex = i;
        break;
      }
    }

    if (nsocialIndex > 0) {
      // Coletar linhas de nome (todas as linhas válidas antes de NSocial)
      const nameLines: string[] = [];

      for (let i = 0; i < nsocialIndex; i++) {
        const line = lines[i];

        // Ignorar linhas com campos do sistema
        if (
          /^(NASC|ENT|PRONT|LEITO|HORA|IDADE|SEXO|FILIACAO|[EF]\d{5,})/i.test(
            line,
          )
        ) {
          continue;
        }

        // Ignorar linhas muito curtas ou que são apenas códigos numéricos
        if (line.length < 3 || /^\d+$/.test(line)) {
          continue;
        }

        // Verificar se parece parte de um nome (letras, espaços, vírgulas, acentos)
        if (/^[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s,]+$/i.test(line)) {
          nameLines.push(line);
        }
      }

      if (nameLines.length > 0) {
        // Juntar todas as linhas do nome com espaço
        const fullName = nameLines.join(" ").trim();
        console.log(
          `📋 [EmergencyLabelExtractor] Nome multi-linha detectado: ${nameLines.length} linha(s)`,
        );
        return this.normalizeName(fullName);
      }
    }

    // Fallback: Procurar primeira linha válida nas primeiras 5 linhas
    for (const line of lines.slice(0, 5)) {
      // Ignorar linhas com padrões de campos
      if (
        /^(NSOCIAL|NASC|ENT|PRONT|LEITO|HORA|IDADE|SEXO|[EF]\d{5,})/i.test(line)
      ) {
        continue;
      }

      // Ignorar linhas muito curtas ou que parecem códigos
      if (line.length < 5 || /^\d+$/.test(line)) {
        continue;
      }

      // Verificar se parece um nome (maiúsculas, espaços, letras, vírgulas)
      if (
        /^[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ\s,]+$/i.test(line) &&
        line.split(/[\s,]+/).filter((w) => w.length > 1).length >= 2
      ) {
        return this.normalizeName(line);
      }
    }

    return undefined;
  }

  /**
   * Extrai a data de nascimento
   */
  private static extractBirthDate(text: string): string | undefined {
    // Padrão: Nasc.: DD/MM/YYYY ou Nasc: DD/MM/YYYY
    const nascMatch = text.match(/NASC\s*[.:]+\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (nascMatch) {
      return nascMatch[1];
    }

    // Fallback: procurar padrão de data próximo a "Nasc"
    const datePattern = /NASC[^\d]*(\d{2})\s*\/?\s*(\d{2})\s*\/?\s*(\d{4})/i;
    const match = text.match(datePattern);
    if (match) {
      return `${match[1]}/${match[2]}/${match[3]}`;
    }

    return undefined;
  }

  /**
   * Extrai o sexo do paciente
   */
  private static extractGender(text: string): "M" | "F" | undefined {
    // Padrões variados: Sexo: F, Sexo:F, Sex: M, Sx: F, SEXO F
    const sexoPatterns = [
      /SEXO\s*[.:]+\s*([FM])/i, // Sexo: F, Sexo.: M
      /SEXO\s+([FM])\b/i, // SEXO F, SEXO M
      /SEX[O]?\s*[.:]*\s*([FM])/i, // Sex: F, Sex M
      /\bSX\s*[.:]*\s*([FM])/i, // Sx: F, Sx M
      /\b([FM])\s*$/i, // F ou M no final de linha (fallback)
    ];

    for (const pattern of sexoPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].toUpperCase() as "M" | "F";
      }
    }

    return undefined;
  }

  /**
   * Extrai a operadora de seguro de saúde
   */
  private static extractInsuranceProvider(
    text: string,
    lines: string[],
  ): string | undefined {
    // Estratégia 1: Procurar operadoras conhecidas primeiro (mais confiável)
    const knownProviders = [
      { pattern: /BRADESCO\s*SEGUR[^\n]*/i, name: "BRADESCO" },
      { pattern: /BRADESCO[^\n]*/i, name: "BRADESCO" },
      { pattern: /SULAM[EÉ]RICA[^\n]*/i, name: "SUL AMERICA" },
      { pattern: /SUL\s*AM[EÉ]RICA[^\n]*/i, name: "SUL AMERICA" },
      { pattern: /UNIMED[^\n]*/i, name: "UNIMED" },
      { pattern: /AMIL[^\n]*/i, name: "AMIL" },
      { pattern: /NOTRE\s*DAME[^\n]*/i, name: "NOTRE DAME" },
      { pattern: /PORTO\s*SEGURO[^\n]*/i, name: "PORTO SEGURO" },
      { pattern: /PETROBR[AÁ]S[^\n]*/i, name: "PETROBRAS" },
      { pattern: /PROASA[^\n]*/i, name: "PROASA" },
      { pattern: /CAIXA\s*ECON[OÔ]MICA[^\n]*/i, name: "CAIXA" },
      { pattern: /CARE\s*PLUS[^\n]*/i, name: "CARE PLUS" },
      { pattern: /HAPVIDA[^\n]*/i, name: "HAPVIDA" },
      { pattern: /INTERM[EÉ]DICA[^\n]*/i, name: "INTERMEDICA" },
      { pattern: /PREVENT\s*SENIOR[^\n]*/i, name: "PREVENT SENIOR" },
      { pattern: /GOLDEN\s*CROSS[^\n]*/i, name: "GOLDEN CROSS" },
      { pattern: /SAUDE\s*CAIXA[^\n]*/i, name: "SAUDE CAIXA" },
      { pattern: /BANCO\s*CENTRAL[^\n]*/i, name: "BANCO CENTRAL" },
      { pattern: /U[NA]AFISCO[^\n]*/i, name: "UNAFISCO" },
      { pattern: /CASSI[^\n]*/i, name: "CASSI" },
    ];

    for (const { pattern, name } of knownProviders) {
      if (pattern.test(text)) {
        return name;
      }
    }

    // Estratégia 2: Procurar linha ANTES de Pront (padrão comum nas etiquetas)
    // A operadora geralmente aparece na linha anterior a "Pront."
    for (let i = 0; i < lines.length; i++) {
      if (/PRONT\s*[.:]/i.test(lines[i])) {
        // A linha anterior pode ser a operadora
        if (i > 0) {
          const prevLine = lines[i - 1];
          if (
            prevLine &&
            !this.isSystemField(prevLine) &&
            !/^\d+$/.test(prevLine)
          ) {
            // Verificar se não é apenas hora/data
            if (!/^\d{2}[\/:\-]\d{2}/.test(prevLine)) {
              const cleaned = prevLine
                .replace(/\s*SEXO\s*:\s*[FM]\s*$/i, "")
                .trim();
              if (cleaned.length > 3 && /[A-Z]/i.test(cleaned)) {
                return this.normalizeInsuranceProvider(cleaned);
              }
            }
          }
        }
      }
    }

    // Estratégia 3: Procurar linha após Ent: que não seja Pront
    for (let i = 0; i < lines.length; i++) {
      if (/^ENT\s*:/i.test(lines[i])) {
        // A próxima linha pode ser a operadora
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (
            nextLine &&
            !this.isSystemField(nextLine) &&
            !/^\d+$/.test(nextLine)
          ) {
            if (/[A-Z]/i.test(nextLine) && nextLine.length > 3) {
              return this.normalizeInsuranceProvider(nextLine);
            }
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Verifica se a linha é um campo do sistema (não operadora)
   */
  private static isSystemField(line: string): boolean {
    return /^(NSOCIAL|NASC|ENT|HORA|PRONT|LEITO|IDADE|SEXO|[EF]\d{5,})/i.test(
      line,
    );
  }

  /**
   * Normaliza o nome do paciente
   */
  private static normalizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Normaliza o nome da operadora de seguro
   */
  private static normalizeInsuranceProvider(provider: string): string {
    // Remover códigos e sufixos desnecessários
    let normalized = provider
      .replace(/\/\d+\s*/g, "/") // Remover números após /
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    // Mapear para nomes padronizados
    if (/BRADESCO/i.test(normalized)) return "BRADESCO";
    if (/SULAM[EÉ]RICA/i.test(normalized)) return "SUL AMERICA";
    if (/SUL\s*AM[EÉ]RICA/i.test(normalized)) return "SUL AMERICA";
    if (/UNIMED/i.test(normalized)) return "UNIMED";
    if (/AMIL/i.test(normalized)) return "AMIL";
    if (/NOTRE\s*DAME/i.test(normalized)) return "NOTRE DAME";
    if (/PORTO\s*SEGURO/i.test(normalized)) return "PORTO SEGURO";
    if (/PETROBR/i.test(normalized)) return "PETROBRAS";
    if (/PROASA/i.test(normalized)) return "PROASA";
    if (/CAIXA/i.test(normalized)) return "CAIXA";
    if (/CARE\s*PLUS/i.test(normalized)) return "CARE PLUS";
    if (/HAPVIDA/i.test(normalized)) return "HAPVIDA";
    if (/INTERM[EÉ]DICA/i.test(normalized)) return "INTERMEDICA";
    if (/PREVENT\s*SENIOR/i.test(normalized)) return "PREVENT SENIOR";
    if (/GOLDEN\s*CROSS/i.test(normalized)) return "GOLDEN CROSS";
    if (/SAUDE\s*CAIXA/i.test(normalized)) return "SAUDE CAIXA";
    if (/BANCO\s*CENTRAL/i.test(normalized)) return "BANCO CENTRAL";
    if (/U[NA]AFISCO/i.test(normalized)) return "UNAFISCO";
    if (/CASSI/i.test(normalized)) return "CASSI";

    return normalized;
  }
}
