/**
 * Extrator para telas do sistema MV - Tipo CHN (layout padrão)
 * Extrai dados do paciente E dados do plano de saúde de uma única imagem
 */

import { matchLabel, matchMVLabel } from '../utils/fuzzy-label-matcher';

export interface MVPatientData {
  nome?: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  sexo?: string;
  idade?: string;
  estadoCivil?: string;
  nomeMae?: string;
  nomePai?: string;
  naturalidade?: string;
  nacionalidade?: string;
  profissao?: string;
  escolaridade?: string;
  tipoSanguineo?: string;
  email?: string;
  telefone?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  codigoPaciente?: string;
  codigoAtendimento?: string;
  matriculaSame?: string;
}

export interface MVInsuranceData {
  convenio?: string;
  plano?: string;
  subplano?: string;
  numeroCarteira?: string;
  cns?: string;
}

export interface MVExtractionResult {
  success: boolean;
  patient: MVPatientData;
  insurance: MVInsuranceData;
  confidence: number;
  errors: string[];
}

export class MVChnExtractor {
  /**
   * Extrai dados completos de uma tela do sistema MV - Layout CHN
   */
  static extract(text: string): MVExtractionResult {
    const normalizedText = text.replace(/\s+/g, " ");
    const lines = text.split(/\n/);
    
    console.log("🏨 [MV-CHN] Iniciando extração de tela MV tipo CHN...");
    
    const patient = this.extractPatientData(normalizedText, lines);
    const insurance = this.extractInsuranceData(normalizedText, lines);
    
    const errors: string[] = [];
    if (!patient.nome) errors.push("Nome do paciente não encontrado");
    if (!patient.cpf && !patient.rg) errors.push("CPF ou RG não encontrado");
    if (!insurance.convenio) errors.push("Convênio não encontrado");
    
    const fieldsFound = [
      patient.nome,
      patient.cpf,
      patient.rg,
      patient.dataNascimento,
      insurance.convenio,
      insurance.numeroCarteira,
    ].filter(Boolean).length;
    
    const confidence = Math.min(0.95, 0.5 + (fieldsFound * 0.08));
    
    console.log(`🏨 [MV-CHN] Campos encontrados: ${fieldsFound}/6`);
    console.log(`🏨 [MV-CHN] Confiança: ${(confidence * 100).toFixed(0)}%`);
    
    return {
      success: fieldsFound >= 2,
      patient,
      insurance,
      confidence,
      errors,
    };
  }
  
  private static extractPatientData(text: string, lines: string[]): MVPatientData {
    const patient: MVPatientData = {};
    const upperText = text.toUpperCase();
    
    // ========================================
    // NOME - Estratégia CHN: Nome nas primeiras linhas em maiúsculas
    // Linha seguinte geralmente começa com "Atendimento"
    // ========================================
    
    // Limpar linhas
    const cleanLines = lines.map(l => l.trim()).filter(l => l.length > 0);
    
    // Estratégia 1: Buscar linha em maiúsculas seguida de "Atendimento"
    for (let i = 0; i < Math.min(cleanLines.length - 1, 15); i++) {
      const line = cleanLines[i].trim();
      const nextLine = cleanLines[i + 1]?.trim() || "";
      
      // Verificar se próxima linha começa com "Atendimento"
      if (/^Atendimento/i.test(nextLine)) {
        // A linha atual deve ser o nome (maiúsculas, pelo menos 2 palavras)
        if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{5,60}$/.test(line) &&
            line.split(/\s+/).length >= 2 &&
            !/^(UNIDADE|HOSPITAL|ATENDIMENTO|COMPLEXO|EMERGENCIA|AMBULAT)/i.test(line)) {
          patient.nome = this.cleanName(line);
          console.log(`🏨 [MV-CHN] Nome encontrado (estratégia Atendimento): ${patient.nome}`);
          break;
        }
      }
    }
    
    // Estratégia 2: Primeira linha totalmente em maiúsculas que parece nome
    if (!patient.nome) {
      for (let i = 0; i < Math.min(cleanLines.length, 10); i++) {
        const line = cleanLines[i].trim();
        
        // Nome deve ser: maiúsculas, 2+ palavras, não ser label de sistema
        if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{8,60}$/.test(line) &&
            line.split(/\s+/).length >= 2 &&
            !/^(UNIDADE|HOSPITAL|ATENDIMENTO|COMPLEXO|EMERGENCIA|AMBULAT|NOME|MAE|PAI|CONVENIO|PLANO)/i.test(line) &&
            !/\d/.test(line)) {  // Não contém números
          patient.nome = this.cleanName(line);
          console.log(`🏨 [MV-CHN] Nome encontrado (estratégia maiúsculas): ${patient.nome}`);
          break;
        }
      }
    }
    
    // Estratégia 3 (fallback): Padrões regex originais
    if (!patient.nome) {
      const nomeStopWords = [
        'CÓD', 'COD', 'PACIENTE', 'FEMININO', 'MASCULINO', 'ATENDIMENTO',
        'DATA', 'NASCIMENTO', 'NATURALIDADE', 'PROFISSÃO', 'PROFISSAO',
        'MÃE', 'MAE', 'PAI', 'EXAMES', 'MEDICAÇÕES', 'MEDICACOES',
        'NACIONALIDADE', 'TIPO', 'RAÇA', 'RACA', 'ESCOLARIDADE',
        'RELIGIÃO', 'RELIGIAO', 'RG', 'CPF', 'CNS', 'CONVÊNIO', 'CONVENIO',
        'PLANO', 'CARTEIRA', 'ENDEREÇO', 'ENDERECO', 'TELEFONE', 'EMAIL',
      ].join('|');
      
      const nomePatterns = [
        new RegExp(`NOME\\s+(?:DE\\s+REGISTRO\\s+)?[:\\-]?\\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\\s]+?)(?:\\s+(?:${nomeStopWords}|\\d))`, 'i'),
        /^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{5,50})\s+(?:FEMININO|MASCULINO)/im,
        new RegExp(`NOME\\s*[:\\-]?\\s*\\n?\\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\\s]+?)(?:\\s+(?:${nomeStopWords}|\\d)|$)`, 'i'),
      ];
      
      for (const pattern of nomePatterns) {
        const match = text.match(pattern);
        if (match?.[1]) {
          patient.nome = this.cleanName(match[1]);
          console.log(`🏨 [MV-CHN] Nome encontrado (regex fallback): ${patient.nome}`);
          break;
        }
      }
    }
    
    // CPF - múltiplos padrões
    const cpfPatterns = [
      /CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2})/i,
      /CPF[:\s]*(\d{11})/i,
      /(\d{3}\.\d{3}\.\d{3}[-.]?\d{2})/,
    ];
    
    for (const pattern of cpfPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const cpfDigits = match[1].replace(/\D/g, '');
        if (cpfDigits.length === 11 && this.isValidCPF(cpfDigits)) {
          patient.cpf = this.formatCPF(match[1]);
          break;
        }
      }
    }
    
    // Fallback: buscar qualquer sequência de 11+ dígitos e validar como CPF
    if (!patient.cpf) {
      const allDigitSequences = text.match(/\d{11,}/g) || [];
      for (const seq of allDigitSequences) {
        const cpf = seq.substring(0, 11);
        if (this.isValidCPF(cpf)) {
          patient.cpf = this.formatCPF(cpf);
          break;
        }
      }
    }
    
    // RG
    const rgMatch = text.match(/\bRG[:\s]*(\d{1,3}\.?\d{3}\.?\d{3}[-.]?\d?|\d{7,9})/i);
    if (rgMatch) {
      patient.rg = rgMatch[1].replace(/\D/g, "");
    }
    
    // Data de Nascimento
    const nascPatterns = [
      /(?:DATA\s+DE\s+)?NASCIMENTO[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
      /NASCIMENTO[,\s]+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
    ];
    for (const pattern of nascPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        patient.dataNascimento = match[1].replace(/[\-\.]/g, "/");
        break;
      }
    }
    
    // Sexo
    if (upperText.includes("FEMININO")) {
      patient.sexo = "FEMININO";
    } else if (upperText.includes("MASCULINO")) {
      patient.sexo = "MASCULINO";
    }
    
    // Idade
    const idadeMatch = text.match(/(?:IDADE|(\d{1,3})\s*ANOS?\s*(?:\d+\s*MESES?)?)/i);
    if (idadeMatch?.[1]) {
      patient.idade = idadeMatch[1];
    } else {
      const idadeMatch2 = text.match(/(\d{1,3})\s*ANOS?\s*(?:\d+\s*MESES?)?/i);
      if (idadeMatch2?.[1]) {
        patient.idade = idadeMatch2[1];
      }
    }
    
    // Estado Civil
    const estadoCivilMatch = text.match(/ESTADO\s+CIVIL[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ]+)/i);
    if (estadoCivilMatch?.[1]) {
      patient.estadoCivil = estadoCivilMatch[1].trim();
    } else if (upperText.includes("SOLTEIRO")) {
      patient.estadoCivil = "SOLTEIRO";
    } else if (upperText.includes("CASADO")) {
      patient.estadoCivil = "CASADO";
    } else if (upperText.includes("DIVORCIADO")) {
      patient.estadoCivil = "DIVORCIADO";
    } else if (upperText.includes("VIÚVO") || upperText.includes("VIUVO")) {
      patient.estadoCivil = "VIÚVO";
    }
    
    // Nome da Mãe
    const maeMatch = text.match(/M[ÃA]E[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+?)(?:\s+(?:RG|CPF|PAI|\d{3}\.|$))/i);
    if (maeMatch?.[1]) {
      patient.nomeMae = this.cleanName(maeMatch[1]);
    }
    
    // Nome do Pai
    const paiMatch = text.match(/PAI[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+?)(?:\s+(?:RG|CPF|SAME|CÓDIGO|\d{3}\.|$))/i);
    if (paiMatch?.[1]) {
      patient.nomePai = this.cleanName(paiMatch[1]);
    }
    
    // Naturalidade
    const natMatch = text.match(/NATURALIDADE[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+?)(?:\s+(?:PROFISSÃO|ESCOLARIDADE|TIPO|$))/i);
    if (natMatch?.[1]) {
      patient.naturalidade = natMatch[1].trim();
    }
    
    // Nacionalidade
    const nacionalidadeMatch = text.match(/NACIONALIDADE[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ]+)/i);
    if (nacionalidadeMatch?.[1]) {
      patient.nacionalidade = nacionalidadeMatch[1].trim();
    } else if (upperText.includes("BRASILEIRA") || upperText.includes("BRASILEIRO")) {
      patient.nacionalidade = "BRASILEIRA";
    }
    
    // Profissão
    const profissaoMatch = text.match(/PROFISS[ÃA]O[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+?)(?:\s+(?:ESCOLARIDADE|MÃE|MAE|$))/i);
    if (profissaoMatch?.[1]) {
      patient.profissao = profissaoMatch[1].trim();
    }
    
    // Escolaridade
    const escolaridadeMatch = text.match(/ESCOLARIDADE[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]*)/i);
    if (escolaridadeMatch?.[1]) {
      patient.escolaridade = escolaridadeMatch[1].trim();
    }
    
    // Tipo Sanguíneo
    const tipoSangMatch = text.match(/TIPO\s+SANGU[IÍ]NEO[:\s]*\n?\s*([ABO][+-]?|SEM\s+INFORMA)/i);
    if (tipoSangMatch?.[1]) {
      patient.tipoSanguineo = tipoSangMatch[1].trim();
    }
    
    // Email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch?.[1]) {
      patient.email = emailMatch[1].toLowerCase();
    }
    
    // Telefone
    // Estratégia 1: Número de 10-11 dígitos seguido de vírgula e email (padrão CHN do MV)
    // Ex: "21991299606, agathagonze@gmail.com" ou "21988471280, fernandacunhavet@gmail.com"
    const telEmailPattern = text.match(/(\d{10,11})\s*[,;]\s*[a-zA-Z0-9._%+-]+@/);
    if (telEmailPattern?.[1]) {
      const digits = telEmailPattern[1];
      const ddd = digits.slice(0, 2);
      const prefix = digits.slice(2, -4);
      const suffix = digits.slice(-4);
      patient.telefone = `(${ddd}) ${prefix}-${suffix}`;
      console.log(`🏨 [MV-CHN] Telefone encontrado (padrão tel,email): ${patient.telefone}`);
    }
    
    // Estratégia 2: Número de 10-11 dígitos logo após CEP (mesma linha ou próxima)
    // Ex: "CEP 28013037\n21991299606"
    if (!patient.telefone) {
      const cepTelPattern = text.match(/CEP\s*\d{5,8}\s*\n?\s*(\d{10,11})/i);
      if (cepTelPattern?.[1]) {
        const digits = cepTelPattern[1];
        const ddd = digits.slice(0, 2);
        const prefix = digits.slice(2, -4);
        const suffix = digits.slice(-4);
        patient.telefone = `(${ddd}) ${prefix}-${suffix}`;
        console.log(`🏨 [MV-CHN] Telefone encontrado (padrão pós-CEP): ${patient.telefone}`);
      }
    }
    
    // Estratégia 3: Label "TELEFONE" ou "CONTATO" seguido do número
    if (!patient.telefone) {
      const telLabelMatch = text.match(/(?:TELEFONE|CONTATO)[:\s]*\n?\s*(\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4})/i);
      if (telLabelMatch?.[1]) {
        const digits = telLabelMatch[1].replace(/\D/g, "");
        if (digits.length >= 10) {
          const ddd = digits.slice(0, 2);
          const prefix = digits.slice(2, -4);
          const suffix = digits.slice(-4);
          patient.telefone = `(${ddd}) ${prefix}-${suffix}`;
          console.log(`🏨 [MV-CHN] Telefone encontrado (label TELEFONE): ${patient.telefone}`);
        }
      }
    }
    
    // Estratégia 4: Formato (XX) XXXXX-XXXX em qualquer lugar do texto
    if (!patient.telefone) {
      const telParenMatch = text.match(/\((\d{2})\)\s*(\d{4,5})[-\s]?(\d{4})/);
      if (telParenMatch) {
        patient.telefone = `(${telParenMatch[1]}) ${telParenMatch[2]}-${telParenMatch[3]}`;
        console.log(`🏨 [MV-CHN] Telefone encontrado (parênteses): ${patient.telefone}`);
      }
    }
    
    // Endereço
    patient.endereco = this.extractAddress(text, lines);
    
    // Códigos
    const codPacienteMatch = text.match(/C[OÓ]D\.?\s*PACIENTE[:\s]*(\d+)/i);
    if (codPacienteMatch?.[1]) {
      patient.codigoPaciente = codPacienteMatch[1];
    }
    
    const codAtendimentoMatch = text.match(/(?:C[OÓ]D\.?\s*)?ATENDIMENTO[:\s]*(\d+)/i);
    if (codAtendimentoMatch?.[1]) {
      patient.codigoAtendimento = codAtendimentoMatch[1];
    }
    
    const sameMatch = text.match(/(?:MATR[IÍ]CULA\s+)?SAME[:\s]*(\d+)/i);
    if (sameMatch?.[1]) {
      patient.matriculaSame = sameMatch[1];
    }
    
    return patient;
  }
  
  private static extractInsuranceData(text: string, lines: string[]): MVInsuranceData {
    const insurance: MVInsuranceData = {};
    const upperText = text.toUpperCase();
    const cleanLines = lines.map(l => l.trim()).filter(l => l.length > 0);
    
    // Lista de operadoras conhecidas no Brasil
    const knownOperators = [
      "AMIL", "UNIMED", "BRADESCO SAUDE", "BRADESCO SAÚDE", "SULAMERICA", "SULAMÉRICA",
      "HAPVIDA", "NOTRE DAME", "INTERMÉDICA", "INTERMEDICA", "CASSI", "GEAP", 
      "GOLDEN CROSS", "PORTO SEGURO", "SAUDE CAIXA", "SAÚDE CAIXA", "PETROBRAS",
      "CARE PLUS", "OMINT", "ALLIANZ", "ONE HEALTH", "PREVENT SENIOR", "ASSIM SAUDE",
      "MEDISERVICE", "SAUDE BRADESCO", "SAÚDE BRADESCO", "AMILMED", "AMIL SAUDE",
      "UNIMED SEGUROS", "UNIMED NACIONAL", "UNIMED RIO", "UNIMED SP", "UNIMED BH",
      "MEDIAL SAUDE", "MEDIAL SAÚDE", "SAÚDE PETROBRÁS", "FUNDAÇÃO PETROBRAS"
    ];
    
    // ========================================
    // CONVÊNIO - Buscar por label linha-por-linha ou operadora conhecida
    // ========================================
    
    // Estratégia 1: Buscar label "Convênio" e valor na próxima linha (com fuzzy matching)
    for (let i = 0; i < cleanLines.length; i++) {
      const line = cleanLines[i].trim();
      if (matchMVLabel(line, "CONVENIO")) {
        console.log(`🏥 [MV-CHN] Label "Convênio" encontrado na linha ${i} (fuzzy match)`);
        // Procurar valor nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 8, cleanLines.length); j++) {
          const nextLine = cleanLines[j].trim();
          // Pular labels conhecidos
          if (/^(Plano|Subplano|N[úu]mero|Carteira|CNS)/i.test(nextLine)) {
            continue;
          }
          // Se parece nome de operadora (maiúsculas, sem números longos)
          if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{2,30}$/.test(nextLine) &&
              !/^\d+$/.test(nextLine)) {
            insurance.convenio = nextLine;
            console.log(`🏥 [MV-CHN] Convênio encontrado: ${insurance.convenio}`);
            break;
          }
        }
        break;
      }
    }
    
    // Estratégia 2: Regex tradicional
    if (!insurance.convenio) {
      const convenioPatterns = [
        /CONV[EÊ]NIO[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+?)(?:\s+(?:PLANO|SUBPLANO|NACIONAL|$))/i,
        /OPERADORA[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+)/i,
      ];
      
      for (const pattern of convenioPatterns) {
        const match = text.match(pattern);
        if (match?.[1]) {
          insurance.convenio = this.cleanName(match[1]);
          break;
        }
      }
    }
    
    // Estratégia 3: Busca operadoras conhecidas no texto
    if (!insurance.convenio) {
      for (const operator of knownOperators) {
        if (upperText.includes(operator.toUpperCase())) {
          insurance.convenio = operator;
          console.log(`🏥 [MV-CHN] Operadora detectada por nome: ${operator}`);
          break;
        }
      }
    }
    
    // ========================================
    // PLANO - Buscar label "Plano" e valor na próxima linha
    // ========================================
    
    // Estratégia 1: Buscar label "Plano" linha-por-linha (com fuzzy matching)
    for (let i = 0; i < cleanLines.length; i++) {
      const line = cleanLines[i].trim();
      if (matchMVLabel(line, "PLANO")) {
        console.log(`🏥 [MV-CHN] Label "Plano" encontrado na linha ${i} (fuzzy match: "${line}")`);
        // Procurar valor nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 8, cleanLines.length); j++) {
          const nextLine = cleanLines[j].trim();
          // Pular labels conhecidos
          if (/^(Subplano|N[úu]mero|Carteira|CNS|Conv[êe]nio)/i.test(nextLine)) {
            continue;
          }
          // Se parece nome de plano (letras, números, espaços)
          if (/^[A-Z0-9][A-Z0-9\s]{2,50}$/i.test(nextLine) &&
              nextLine.length >= 3) {
            insurance.plano = nextLine;
            console.log(`🏥 [MV-CHN] Plano encontrado: ${insurance.plano}`);
            break;
          }
        }
        break;
      }
    }
    
    // Estratégia 2: Regex tradicional
    if (!insurance.plano) {
      const planoMatch = text.match(/\bPLANO[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9\s]+?)(?:\s+(?:SUBPLANO|NÚMERO|CARTEIRA|$))/i);
      if (planoMatch?.[1]) {
        insurance.plano = planoMatch[1].trim();
      }
    }
    
    // ========================================
    // SUBPLANO
    // ========================================
    const subplanoMatch = text.match(/SUBPLANO[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9\s]*)/i);
    if (subplanoMatch?.[1]) {
      insurance.subplano = subplanoMatch[1].trim();
    }
    
    // ========================================
    // NÚMERO DA CARTEIRA - Buscar label linha-por-linha
    // ========================================
    
    // Estratégia 1: Buscar labels de carteira linha-por-linha (com fuzzy matching)
    for (let i = 0; i < cleanLines.length; i++) {
      const line = cleanLines[i].trim();
      if (matchMVLabel(line, "NUMERO_CARTEIRA") || /carteira/i.test(line)) {
        console.log(`🏥 [MV-CHN] Label de carteira encontrado na linha ${i} (fuzzy match: "${line}")`);
        // Procurar valor numérico nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 8, cleanLines.length); j++) {
          const nextLine = cleanLines[j].trim();
          // Pular labels conhecidos
          if (/^(Plano|Subplano|Conv[êe]nio|CNS|N[úu]mero)/i.test(nextLine)) {
            continue;
          }
          // Número de carteira (8-20 dígitos, pode ter pontos/hifens)
          const carteiraMatch = nextLine.match(/^(\d[\d.\-\s]{6,25})$/);
          if (carteiraMatch) {
            insurance.numeroCarteira = carteiraMatch[1].replace(/\D/g, "");
            console.log(`🏥 [MV-CHN] Número da carteira encontrado: ${insurance.numeroCarteira}`);
            break;
          }
        }
        if (insurance.numeroCarteira) break;
      }
    }
    
    // Estratégia 2: Regex tradicional
    if (!insurance.numeroCarteira) {
      const carteiraPatterns = [
        /N[UÚ]MERO\s+DA\s+CARTEIRA[:\s]*\n?\s*(\d+)/i,
        /CARTEIRA[:\s]*\n?\s*(\d{8,20})/i,
      ];
      
      for (const pattern of carteiraPatterns) {
        const match = text.match(pattern);
        if (match?.[1]) {
          insurance.numeroCarteira = match[1];
          console.log(`🏥 [MV-CHN] Número da carteira (regex): ${insurance.numeroCarteira}`);
          break;
        }
      }
    }
    
    // ========================================
    // CNS (Cartão Nacional de Saúde)
    // ========================================
    
    // Estratégia 1: Buscar label "CNS" linha-por-linha (com fuzzy matching)
    for (let i = 0; i < cleanLines.length; i++) {
      const line = cleanLines[i].trim();
      if (matchMVLabel(line, "CNS")) {
        console.log(`🏥 [MV-CHN] Label "CNS" encontrado na linha ${i} (fuzzy match)`);
        // Procurar valor numérico nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 5, cleanLines.length); j++) {
          const nextLine = cleanLines[j].trim();
          // CNS tem 15 dígitos
          const cnsMatch = nextLine.match(/^(\d{15})$/);
          if (cnsMatch) {
            insurance.cns = cnsMatch[1];
            console.log(`🏥 [MV-CHN] CNS encontrado: ${insurance.cns}`);
            break;
          }
        }
        break;
      }
    }
    
    // Estratégia 2: Regex tradicional
    if (!insurance.cns) {
      const cnsPatterns = [
        /CART[ÃA]O\s+NACIONAL\s+DE\s+SA[UÚ]DE[:\s]*\n?\s*(\d+)/i,
        /\bCNS[:\s]*\n?\s*(\d{15})/i,
      ];
      
      for (const pattern of cnsPatterns) {
        const match = text.match(pattern);
        if (match?.[1]) {
          insurance.cns = match[1];
          break;
        }
      }
    }
    
    return insurance;
  }
  
  private static extractAddress(text: string, lines: string[]): MVPatientData["endereco"] {
    const address: MVPatientData["endereco"] = {};
    
    // Logradouro
    const logradouroMatch = text.match(/LOGRADOURO[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s,]+?)(?:\s+(?:NÚMERO|N[ÚU]MERO|COMPLEMENTO|\d+$))/i);
    if (logradouroMatch?.[1]) {
      address.logradouro = logradouroMatch[1].trim();
    }
    
    // Número
    const numeroMatch = text.match(/N[UÚ]MERO[:\s]*\n?\s*(\d+[A-Z]?)/i);
    if (numeroMatch?.[1]) {
      address.numero = numeroMatch[1];
    }
    
    // Complemento
    const complementoMatch = text.match(/COMPLEMENTO[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9\s,]*?)(?:\s+(?:BAIRRO|$))/i);
    if (complementoMatch?.[1]) {
      address.complemento = complementoMatch[1].trim();
    }
    
    // Bairro
    const bairroMatch = text.match(/BAIRRO[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+?)(?:\s+(?:CIDADE|$))/i);
    if (bairroMatch?.[1]) {
      address.bairro = bairroMatch[1].trim();
    }
    
    // Cidade
    const cidadeMatch = text.match(/CIDADE[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+?)(?:\s+(?:ESTADO|UF|$))/i);
    if (cidadeMatch?.[1]) {
      address.cidade = cidadeMatch[1].trim();
    }
    
    // Estado
    const estadoMatch = text.match(/ESTADO[:\s]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]+?)(?:\s+(?:CEP|$))/i);
    if (estadoMatch?.[1]) {
      address.estado = estadoMatch[1].trim();
    }
    
    // CEP
    const cepMatch = text.match(/CEP[:\s]*\n?\s*(\d{5}[-.]?\d{3}|\d{8})/i);
    if (cepMatch?.[1]) {
      address.cep = cepMatch[1].replace(/\D/g, "");
    }
    
    return address;
  }
  
  private static cleanName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^\wÀ-ÿ\s]/g, "")
      .trim();
  }
  
  private static isValidCPF(cpf: string): boolean {
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  }
  
  private static formatCPF(cpf: string): string {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    return digits;
  }
}
