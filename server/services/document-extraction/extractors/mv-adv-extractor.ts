/**
 * Extrator para telas do sistema MV - Tipo ADV (layout alternativo/atendimento)
 * Extrai dados do paciente E dados do plano de saúde de uma única imagem
 * 
 * Layout ADV: Formulário em GRID onde labels ficam ACIMA dos valores
 * Estrutura típica:
 *   Nome                 Cód. Paciente    Cód. Atendimento    Sexo
 *   ROSIMARY DE SA...    15253            315430              FEMININO
 */

import { MVPatientData, MVInsuranceData, MVExtractionResult } from './mv-chn-extractor';
import { matchLabel, matchMVLabel } from '../utils/fuzzy-label-matcher';

export class MVAdvExtractor {
  /**
   * Extrai dados completos de uma tela do sistema MV - Layout ADV
   */
  static extract(text: string): MVExtractionResult {
    const lines = text.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
    
    console.log("🏨 [MV-ADV] Iniciando extração de tela MV tipo ADV...");
    console.log(`🏨 [MV-ADV] Total de linhas: ${lines.length}`);
    
    // Criar mapa de labels -> valores (linha seguinte)
    const fieldMap = this.buildFieldMap(lines);
    console.log(`🏨 [MV-ADV] Mapa de campos:`, Object.keys(fieldMap));
    
    const patient = this.extractPatientData(text, lines, fieldMap);
    const insurance = this.extractInsuranceData(text, lines, fieldMap);
    
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
    
    console.log(`🏨 [MV-ADV] Campos encontrados: ${fieldsFound}/6`);
    console.log(`🏨 [MV-ADV] Confiança: ${(confidence * 100).toFixed(0)}%`);
    
    return {
      success: fieldsFound >= 2,
      patient,
      insurance,
      confidence,
      errors,
    };
  }
  
  /**
   * Constrói mapa de campos baseado na estrutura do formulário ADV
   * No ADV, os labels são seguidos pelos valores na próxima linha ou na mesma linha após espaço
   */
  private static buildFieldMap(lines: string[]): Record<string, string> {
    const fieldMap: Record<string, string> = {};
    
    // Labels conhecidos do ADV (em ordem de prioridade)
    const knownLabels = [
      'NOME', 'CÓD. PACIENTE', 'COD. PACIENTE', 'CÓD. ATENDIMENTO', 'COD. ATENDIMENTO',
      'SEXO', 'NASCIMENTO', 'IDADE', 'ESTADO CIVIL',
      'MÃE', 'MAE', 'RG', 'CPF', 'NATURALIDADE', 'PROFISSÃO', 'PROFISSAO', 'ESCOLARIDADE',
      'PAI', 'RELIGIÃO', 'RELIGIAO', 'NACIONALIDADE', 'RAÇA', 'RACA', 'TIPO SANGUÍNEO', 'TIPO SANGUINEO', 'E-MAIL', 'EMAIL',
      'CONVÊNIO', 'CONVENIO', 'PLANO', 'SUBPLANO', 'NÚMERO DA CARTEIRA', 'NUMERO DA CARTEIRA',
      'CARTÃO NACIONAL DE SAÚDE', 'CARTAO NACIONAL DE SAUDE',
      'MATRÍCULA SAME', 'MATRICULA SAME', 'MÉDICO DE REFERÊNCIA', 'MEDICO DE REFERENCIA',
      'UNIDADE DE REFERÊNCIA', 'UNIDADE DE REFERENCIA',
      'LOGRADOURO', 'NÚMERO', 'NUMERO', 'COMPLEMENTO', 'BAIRRO',
      'CIDADE', 'ESTADO', 'CEP', 'TELEFONE PARA CONTATO',
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      
      // Verificar se a linha contém um label conhecido
      for (const label of knownLabels) {
        if (line.includes(label)) {
          // Estratégia 1: Valor na próxima linha
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            // Se a próxima linha não é um label e tem conteúdo
            if (nextLine.length > 0 && !this.isLabelLine(nextLine, knownLabels)) {
              // Pegar apenas o primeiro valor (pode haver múltiplos campos na linha)
              const values = this.splitGridValues(nextLine);
              if (values.length > 0) {
                const labelIndex = this.getLabelPositionIndex(line, label, knownLabels);
                if (labelIndex < values.length) {
                  fieldMap[label] = values[labelIndex];
                } else if (values[0]) {
                  fieldMap[label] = values[0];
                }
              }
            }
          }
        }
      }
    }
    
    return fieldMap;
  }
  
  /**
   * Verifica se uma linha é composta apenas de labels
   */
  private static isLabelLine(line: string, knownLabels: string[]): boolean {
    const upperLine = line.toUpperCase();
    // Se a linha contém múltiplos labels conhecidos, provavelmente é uma linha de cabeçalho
    let labelCount = 0;
    for (const label of knownLabels) {
      if (upperLine.includes(label)) {
        labelCount++;
      }
    }
    return labelCount >= 2;
  }
  
  /**
   * Divide valores de uma linha de grid (valores separados por espaços grandes ou tabs)
   */
  private static splitGridValues(line: string): string[] {
    // Dividir por múltiplos espaços (2+) ou tabs
    return line.split(/\s{2,}|\t/).map(v => v.trim()).filter(v => v.length > 0);
  }
  
  /**
   * Encontra a posição de um label na linha de cabeçalho
   */
  private static getLabelPositionIndex(headerLine: string, targetLabel: string, knownLabels: string[]): number {
    const upperLine = headerLine.toUpperCase();
    const labelsInLine: { label: string; position: number }[] = [];
    
    for (const label of knownLabels) {
      const pos = upperLine.indexOf(label);
      if (pos >= 0) {
        labelsInLine.push({ label, position: pos });
      }
    }
    
    // Ordenar por posição
    labelsInLine.sort((a, b) => a.position - b.position);
    
    // Encontrar índice do label alvo
    return labelsInLine.findIndex(l => l.label === targetLabel);
  }
  
  private static extractPatientData(text: string, lines: string[], fieldMap: Record<string, string>): MVPatientData {
    const patient: MVPatientData = {};
    const upperText = text.toUpperCase();
    
    // ========================================
    // ESTRUTURA DO OCR ADV:
    // O OCR retorna cada campo em linha separada, na ordem:
    // [Labels na ordem] -> [Valores na mesma ordem]
    // Ex: "Nome" -> "Cód. Paciente" -> "Sexo" -> "ROSIMARY" -> "15253" -> "FEMININO"
    // ========================================
    
    // Encontrar a seção "Informações do Paciente"
    let infoIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/Informa[çc][õo]es do Paciente/i.test(lines[i])) {
        infoIndex = i;
        console.log(`🏨 [MV-ADV] Seção "Informações do Paciente" na linha ${i}`);
        break;
      }
    }
    
    // ========================================
    // NOME - Estratégia: encontrar label "Nome" e o valor correspondente
    // ========================================
    if (infoIndex >= 0) {
      // Procurar a linha que contém só "Nome"
      for (let i = infoIndex; i < Math.min(infoIndex + 15, lines.length); i++) {
        if (matchMVLabel(lines[i].trim(), "NOME")) {
          console.log(`🏨 [MV-ADV] Label "Nome" encontrado na linha ${i}`);
          
          // Contar quantos labels vêm após "Nome" antes dos valores
          // Labels típicos: "Cód. Paciente", "Cód. Atendimento", "Sexo"
          let labelsCount = 0;
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            const nextLine = lines[j].trim();
            // Se parece um label (começa com letra, curto, não é todo maiúsculo com espaços)
            if (/^(C[óo]d|Sexo|Nascimento|Idade|Estado)/i.test(nextLine)) {
              labelsCount++;
            } else if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{5,}$/i.test(nextLine)) {
              // Encontrou o primeiro valor (nome do paciente)
              patient.nome = this.cleanName(nextLine);
              console.log(`🏨 [MV-ADV] Nome encontrado: ${patient.nome}`);
              break;
            }
          }
          break;
        }
      }
    }
    
    // Fallback: procurar linha que parece nome de pessoa (maiúsculas, 2+ palavras, sem números)
    if (!patient.nome) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Nome: 2+ palavras, só letras, maiúsculas, entre 10-50 chars
        if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{10,45}$/.test(line) &&
            line.split(/\s+/).length >= 2 &&
            !/^(AUGUSTO|RODRIGO|BRADESCO|NACIONAL|BRASILEIRA|FEMININO|MASCULINO)/i.test(line)) {
          // Verificar se a linha anterior é "Nome" ou similar, ou se a próxima linha é um número
          const prevLine = i > 0 ? lines[i - 1] : '';
          const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
          
          if (/Nome|Sexo|C[óo]d/i.test(prevLine) || /^\d{4,}$/.test(nextLine)) {
            patient.nome = this.cleanName(line);
            console.log(`🏨 [MV-ADV] Nome encontrado (fallback): ${patient.nome}`);
            break;
          }
        }
      }
    }
    
    // ========================================
    // CPF - Buscar na linha após label "CPF" ou via padrão
    // ========================================
    const cpfFromMap = fieldMap['CPF'];
    if (cpfFromMap) {
      const cpfDigits = cpfFromMap.replace(/\D/g, '');
      if (cpfDigits.length === 11 && this.isValidCPF(cpfDigits)) {
        patient.cpf = this.formatCPF(cpfDigits);
        console.log(`🏨 [MV-ADV] CPF encontrado (grid): ${patient.cpf}`);
      }
    }
    
    // Fallback: buscar qualquer sequência válida de 11 dígitos
    if (!patient.cpf) {
      const allDigitSequences = text.match(/\d{11,}/g) || [];
      for (const seq of allDigitSequences) {
        const cpf = seq.substring(0, 11);
        if (this.isValidCPF(cpf)) {
          patient.cpf = this.formatCPF(cpf);
          console.log(`🏨 [MV-ADV] CPF encontrado (fallback): ${patient.cpf}`);
          break;
        }
      }
    }
    
    // ========================================
    // RG - Buscar após label "RG"
    // Estrutura: "Mãe" -> "RG" -> "CPF" -> ... -> "NOEMI" -> "117483909" -> "07711838794"
    // ========================================
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (matchMVLabel(line, "RG")) {
        console.log(`🏨 [MV-ADV] Label "RG" encontrado na linha ${i}`);
        
        // Procurar o valor (número de 7-10 dígitos) nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          
          // Pular labels conhecidos
          if (/^(CPF|Naturalidade|Pai|M[ãa]e|Profiss|Escolaridade|Religi)$/i.test(nextLine)) {
            continue;
          }
          
          // Pular nomes (maiúsculas com espaços)
          if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{5,}$/.test(nextLine)) {
            continue;
          }
          
          // Se parece RG (7-10 dígitos, pode ter pontos)
          const rgDigits = nextLine.replace(/\D/g, '');
          if (rgDigits.length >= 7 && rgDigits.length <= 10) {
            patient.rg = rgDigits;
            console.log(`🏨 [MV-ADV] RG encontrado: ${patient.rg}`);
            break;
          }
        }
        break;
      }
    }
    
    // ========================================
    // DATA DE NASCIMENTO - Buscar na coluna "Nascimento"
    // ========================================
    // Procurar pela linha que tem "Nascimento" no cabeçalho
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/Nascimento\s+Idade/i.test(line) || /Sexo\s+Nascimento/i.test(line)) {
        if (i + 1 < lines.length) {
          const valueLine = lines[i + 1];
          // Procurar data no formato DD/MM/YYYY
          const dateMatch = valueLine.match(/(\d{2}\/\d{2}\/\d{4})/);
          if (dateMatch?.[1]) {
            // Verificar se parece ser data de nascimento (ano < 2020)
            const year = parseInt(dateMatch[1].split('/')[2]);
            if (year < 2020) {
              patient.dataNascimento = dateMatch[1];
              console.log(`🏨 [MV-ADV] Data nascimento (grid): ${patient.dataNascimento}`);
              break;
            }
          }
        }
      }
    }
    
    // Fallback: buscar data que parece ser nascimento (ano entre 1920 e 2015)
    if (!patient.dataNascimento) {
      const allDates = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
      for (const date of allDates) {
        const year = parseInt(date.split('/')[2]);
        if (year >= 1920 && year <= 2015) {
          patient.dataNascimento = date;
          console.log(`🏨 [MV-ADV] Data nascimento (fallback): ${patient.dataNascimento}`);
          break;
        }
      }
    }
    
    // ========================================
    // SEXO
    // ========================================
    if (upperText.includes("FEMININO")) {
      patient.sexo = "FEMININO";
    } else if (upperText.includes("MASCULINO")) {
      patient.sexo = "MASCULINO";
    }
    
    // ========================================
    // NOME DA MÃE - Buscar linha após "Mãe"
    // Estrutura: "Mãe" -> "RG" -> "CPF" -> "NOEMI SILVEIRA" -> "117483909" -> "07711838794"
    // ========================================
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^M[ãa]e$/i.test(line)) {
        console.log(`🏨 [MV-ADV] Label "Mãe" encontrado na linha ${i}`);
        
        // Procurar o valor (nome em maiúsculas, 2+ palavras)
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          
          // Pular labels conhecidos
          if (/^(RG|CPF|Naturalidade|Pai|Profiss|Escolaridade)$/i.test(nextLine)) {
            continue;
          }
          
          // Se parece nome (maiúsculas, 2+ palavras, sem números)
          if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{5,40}$/.test(nextLine) &&
              nextLine.split(/\s+/).length >= 2) {
            patient.nomeMae = this.cleanName(nextLine);
            console.log(`🏨 [MV-ADV] Nome mãe encontrado: ${patient.nomeMae}`);
            break;
          }
        }
        break;
      }
    }
    
    // ========================================
    // TELEFONE - Buscar após "Telefone para contato"
    // Formato: (21) 982564657 ou 21982564657
    // ========================================
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/Telefone para contato/i.test(line)) {
        // Procurar telefone nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          // Telefone: (XX) XXXXX-XXXX ou similar
          const telMatch = nextLine.match(/\(?\d{2}\)?\s*9?\d{4,5}[-\s]?\d{4}/);
          if (telMatch) {
            patient.telefone = telMatch[0].replace(/\D/g, "");
            console.log(`🏨 [MV-ADV] Telefone encontrado: ${patient.telefone}`);
            break;
          }
        }
        break;
      }
    }
    
    // ========================================
    // EMAIL - Buscar via múltiplas estratégias
    // Na tela ADV, o email pode aparecer:
    //   1) No campo "E-mail" do grid (label na linha acima)
    //   2) Como texto livre no OCR (padrão xxx@xxx.xxx)
    // ========================================
    if (!patient.email) {
      // Estratégia 1: Buscar do fieldMap
      const emailFromMap = fieldMap['E-MAIL'] || fieldMap['EMAIL'];
      if (emailFromMap) {
        const emailMatch = emailFromMap.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          patient.email = emailMatch[0].toLowerCase();
          console.log(`🏨 [MV-ADV] Email encontrado (grid): ${patient.email}`);
        }
      }
    }
    
    if (!patient.email) {
      // Estratégia 2: Buscar após label "E-mail" nas linhas seguintes
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (/\bE-?mail\b/i.test(line)) {
          // Verificar se o email está na mesma linha (após o label)
          const sameLineMatch = line.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
          if (sameLineMatch) {
            patient.email = sameLineMatch[0].toLowerCase();
            console.log(`🏨 [MV-ADV] Email encontrado (mesma linha): ${patient.email}`);
            break;
          }
          // Procurar nas próximas linhas
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j].trim();
            const emailMatch = nextLine.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
            if (emailMatch) {
              patient.email = emailMatch[0].toLowerCase();
              console.log(`🏨 [MV-ADV] Email encontrado (após label): ${patient.email}`);
              break;
            }
          }
          if (patient.email) break;
        }
      }
    }
    
    if (!patient.email) {
      // Estratégia 3: Buscar qualquer padrão de email no texto completo
      const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        patient.email = emailMatch[0].toLowerCase();
        console.log(`🏨 [MV-ADV] Email encontrado (fallback texto): ${patient.email}`);
      }
    }
    
    // ========================================
    // CAMPOS DE ENDEREÇO - Buscar na seção "Endereço Residencial"
    // Estrutura similar: Labels primeiro, depois valores
    // ========================================
    
    // Inicializar objeto de endereço
    patient.endereco = {};
    
    // Encontrar a seção de endereço
    let enderecoSectionStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/Endere[çc]o\s+Residencial/i.test(lines[i])) {
        enderecoSectionStart = i;
        console.log(`🏨 [MV-ADV] Seção "Endereço Residencial" na linha ${i}`);
        break;
      }
    }
    
    // LOGRADOURO - Buscar após label "Logradouro"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (matchMVLabel(line, "LOGRADOURO")) {
        console.log(`🏨 [MV-ADV] Label "Logradouro" encontrado na linha ${i}`);
        // Procurar valor (nome de rua em maiúsculas)
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
          const nextLine = lines[j].trim();
          // Pular labels conhecidos
          if (/^(N[úu]mero|Complemento|Bairro|Cidade|Estado|CEP|M[ée]dico|Unidade|Nascimento)/i.test(nextLine)) {
            continue;
          }
          // Se parece endereço (maiúsculas, pode ter RUA, AV, TRAVESSA, etc.)
          if (/^(RUA|R\.|AV\.?|AVENIDA|TRAVESSA|TV\.?|ESTRADA|EST\.?|ALAMEDA|AL\.?|PRACA|LARGO|ROD)/i.test(nextLine) ||
              (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s,.\-]{5,80}$/.test(nextLine) && 
               !/^\d+$/.test(nextLine) && 
               nextLine.split(/\s+/).length >= 2)) {
            patient.endereco.logradouro = nextLine;
            console.log(`🏨 [MV-ADV] Logradouro encontrado: ${patient.endereco.logradouro}`);
            break;
          }
        }
        break;
      }
    }
    
    // NÚMERO - Buscar após label "Número" (na seção de endereço)
    for (let i = enderecoSectionStart > 0 ? enderecoSectionStart : 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (matchMVLabel(line, "NUMERO")) {
        // Procurar valor numérico nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          // Pular labels conhecidos
          if (/^(Complemento|Bairro|Cidade|Estado|CEP|Nascimento|Estado\s+Civil)/i.test(nextLine)) {
            continue;
          }
          // Se é número de endereço (1-5 dígitos, pode ter letra)
          if (/^\d{1,5}[A-Za-z]?$/.test(nextLine)) {
            patient.endereco.numero = nextLine;
            console.log(`🏨 [MV-ADV] Número encontrado: ${patient.endereco.numero}`);
            break;
          }
          // Se é "S/N" ou similar
          if (/^S\/?N$/i.test(nextLine)) {
            patient.endereco.numero = "S/N";
            console.log(`🏨 [MV-ADV] Número encontrado: ${patient.endereco.numero}`);
            break;
          }
        }
        break;
      }
    }
    
    // COMPLEMENTO - Buscar após label "Complemento"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (matchMVLabel(line, "COMPLEMENTO")) {
        console.log(`🏨 [MV-ADV] Label "Complemento" encontrado na linha ${i}`);
        // Procurar valor nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          // Pular labels conhecidos
          if (/^(Bairro|Cidade|Estado|CEP|Nascimento|Estado\s+Civil|Profiss)/i.test(nextLine)) {
            continue;
          }
          // Pular se vazio ou só espaços
          if (!nextLine || nextLine.length < 2) continue;
          // Complemento pode ser "APTO 101", "BL A", "CASA", etc.
          if (/^[A-Z0-9][A-Z0-9\s.\-\/]{0,30}$/i.test(nextLine)) {
            patient.endereco.complemento = nextLine;
            console.log(`🏨 [MV-ADV] Complemento encontrado: ${patient.endereco.complemento}`);
            break;
          }
        }
        break;
      }
    }
    
    // BAIRRO - Buscar após label "Bairro"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (matchMVLabel(line, "BAIRRO")) {
        console.log(`🏨 [MV-ADV] Label "Bairro" encontrado na linha ${i}`);
        // Procurar valor nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          // Pular labels conhecidos
          if (/^(Cidade|Estado|CEP|Telefone)/i.test(nextLine)) {
            continue;
          }
          // Bairro em maiúsculas
          if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s.\-]{2,40}$/.test(nextLine) &&
              !/^\d+$/.test(nextLine)) {
            patient.endereco.bairro = nextLine;
            console.log(`🏨 [MV-ADV] Bairro encontrado: ${patient.endereco.bairro}`);
            break;
          }
        }
        break;
      }
    }
    
    // CIDADE - Buscar após label "Cidade"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (matchMVLabel(line, "CIDADE")) {
        console.log(`🏨 [MV-ADV] Label "Cidade" encontrado na linha ${i}`);
        // Procurar valor nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          // Pular labels conhecidos
          if (/^(Estado|CEP|Telefone|UF)/i.test(nextLine)) {
            continue;
          }
          // Cidade em maiúsculas
          if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s.\-]{2,40}$/.test(nextLine) &&
              !/^\d+$/.test(nextLine)) {
            patient.endereco.cidade = nextLine;
            console.log(`🏨 [MV-ADV] Cidade encontrada: ${patient.endereco.cidade}`);
            break;
          }
        }
        break;
      }
    }
    
    // ESTADO - Buscar após label "Estado" ou UF de 2 letras
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (matchMVLabel(line, "ESTADO")) {
        console.log(`🏨 [MV-ADV] Label "Estado" encontrado na linha ${i}`);
        // Procurar UF (2 letras) nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          // UF de 2 letras
          if (/^[A-Z]{2}$/.test(nextLine)) {
            patient.endereco.estado = nextLine;
            console.log(`🏨 [MV-ADV] Estado encontrado: ${patient.endereco.estado}`);
            break;
          }
        }
        break;
      }
    }
    
    // CEP - Buscar após label "CEP" ou padrão XXXXX-XXX
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (matchMVLabel(line, "CEP")) {
        console.log(`🏨 [MV-ADV] Label "CEP" encontrado na linha ${i}`);
        // Procurar CEP (8 dígitos com ou sem hífen)
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          const cepMatch = nextLine.match(/(\d{5}[-.\s]?\d{3})/);
          if (cepMatch) {
            patient.endereco.cep = cepMatch[1].replace(/\D/g, "");
            console.log(`🏨 [MV-ADV] CEP encontrado: ${patient.endereco.cep}`);
            break;
          }
        }
        break;
      }
    }
    
    // Limpar objeto de endereço se estiver vazio
    if (Object.keys(patient.endereco).length === 0) {
      delete patient.endereco;
    }
    
    return patient;
  }
  
  private static extractInsuranceData(text: string, lines: string[], fieldMap: Record<string, string>): MVInsuranceData {
    const insurance: MVInsuranceData = {};
    
    // ========================================
    // CONVÊNIO - Buscar após label "Convênio"
    // Estrutura: "Convênio" -> "Plano" -> ... -> "BRADESCO OPERADORA" -> "NACIONAL"
    // ========================================
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^Conv[êe]nio$/i.test(line)) {
        console.log(`🏨 [MV-ADV] Label "Convênio" encontrado na linha ${i}`);
        
        // Procurar o valor (nome de operadora em maiúsculas)
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          
          // Pular labels conhecidos
          if (/^(Plano|Subplano|N[úu]mero|Matr[íi]cula|Cart[ãa]o)$/i.test(nextLine)) {
            continue;
          }
          
          // Se parece nome de operadora (maiúsculas, pode ter palavras como OPERADORA, SAUDE)
          if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{3,50}$/.test(nextLine) &&
              !/^(NACIONAL|REGIONAL|ENFERMARIA)$/i.test(nextLine)) {
            insurance.convenio = this.cleanName(nextLine);
            console.log(`🏨 [MV-ADV] Convênio encontrado: ${insurance.convenio}`);
            break;
          }
        }
        break;
      }
    }
    
    // ========================================
    // PLANO - Buscar após label "Plano"
    // ========================================
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (matchMVLabel(line, "PLANO")) {
        console.log(`🏨 [MV-ADV] Label "Plano" encontrado na linha ${i}`);
        
        // Procurar o valor nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          
          // Pular labels conhecidos
          if (/^(Subplano|N[úu]mero|Matr[íi]cula|Cart[ãa]o|M[ée]dico|Unidade)/i.test(nextLine)) {
            continue;
          }
          
          // Se parece nome de plano (pode ser NACIONAL, EMPRESARIAL, etc.)
          if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s\d]{2,40}$/.test(nextLine)) {
            insurance.plano = this.cleanName(nextLine);
            console.log(`🏨 [MV-ADV] Plano encontrado: ${insurance.plano}`);
            break;
          }
        }
        break;
      }
    }
    
    // ========================================
    // NÚMERO DA CARTEIRA - Buscar número longo (13-17 dígitos)
    // ========================================
    // Procurar na coluna "Número da Carteira"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/N[úu]mero\s+da\s+Carteira/i.test(line)) {
        if (i + 1 < lines.length) {
          const valueLine = lines[i + 1];
          const carteiraMatch = valueLine.match(/(\d{10,20})/);
          if (carteiraMatch?.[1]) {
            insurance.numeroCarteira = carteiraMatch[1];
            console.log(`🏨 [MV-ADV] Carteira (grid): ${insurance.numeroCarteira}`);
          }
        }
        break;
      }
    }
    
    // Fallback: buscar número longo que parece carteira
    if (!insurance.numeroCarteira) {
      const carteiraMatch = text.match(/\b(\d{13,17})\b/);
      if (carteiraMatch?.[1]) {
        insurance.numeroCarteira = carteiraMatch[1];
        console.log(`🏨 [MV-ADV] Carteira (fallback): ${insurance.numeroCarteira}`);
      }
    }
    
    // ========================================
    // CNS - Cartão Nacional de Saúde (15 dígitos)
    // Só extrair se vier da label específica "Cartão Nacional de Saúde"
    // ========================================
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/Cart[ãa]o Nacional de Sa[úu]de/i.test(line)) {
        // Procurar número de 15 dígitos nas próximas linhas
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          const cnsMatch = nextLine.match(/^(\d{15})$/);
          if (cnsMatch?.[1]) {
            insurance.cns = cnsMatch[1];
            console.log(`🏨 [MV-ADV] CNS encontrado: ${insurance.cns}`);
            break;
          }
        }
        break;
      }
    }
    
    return insurance;
  }
  
  private static cleanName(name: string): string {
    return name
      .toUpperCase()
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
