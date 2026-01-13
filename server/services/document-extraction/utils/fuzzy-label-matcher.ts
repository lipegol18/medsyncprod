/**
 * Utilitário para correspondência fuzzy de labels OCR
 * Tolera pequenos erros ortográficos comuns em OCR
 */

/**
 * Normaliza texto removendo acentos e convertendo para maiúsculas
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toUpperCase()
    .replace(/[^\w\s]/g, "") // Remove pontuação
    .trim();
}

/**
 * Calcula a distância de Levenshtein entre duas strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // deleção
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Verifica se uma linha corresponde a um label esperado com tolerância a erros OCR
 * 
 * @param line - Linha do OCR a verificar
 * @param targetLabel - Label esperado (ex: "Plano", "Convênio")
 * @param options - Opções de configuração
 * @returns true se a linha corresponde ao label (exato ou fuzzy)
 */
export function matchLabel(
  line: string,
  targetLabel: string,
  options: {
    maxDistance?: number;      // Distância máxima de Levenshtein (padrão: 1 para labels curtos, 2 para longos)
    synonyms?: string[];       // Sinônimos aceitos (ex: ["Numero", "Nro", "N°"])
    requirePrefix?: boolean;   // Requer que comece com a mesma letra (padrão: true)
    exactOnly?: boolean;       // Apenas correspondência exata (padrão: false)
  } = {}
): boolean {
  const {
    synonyms = [],
    requirePrefix = true,
    exactOnly = false,
  } = options;

  const normalizedLine = normalizeText(line);
  const normalizedTarget = normalizeText(targetLabel);
  
  // Correspondência exata (normalizada)
  if (normalizedLine === normalizedTarget) {
    return true;
  }
  
  // Verificar sinônimos
  for (const synonym of synonyms) {
    if (normalizedLine === normalizeText(synonym)) {
      return true;
    }
  }
  
  // Se apenas exato, parar aqui
  if (exactOnly) {
    return false;
  }
  
  // Calcular distância máxima baseada no tamanho do label
  const defaultMaxDistance = normalizedTarget.length <= 5 ? 1 : 2;
  const maxDistance = options.maxDistance ?? defaultMaxDistance;
  
  // Verificar prefixo (primeira letra deve ser igual para evitar falsos positivos)
  if (requirePrefix && normalizedLine.charAt(0) !== normalizedTarget.charAt(0)) {
    return false;
  }
  
  // Verificar tamanho similar (diferença máxima de 2 caracteres)
  if (Math.abs(normalizedLine.length - normalizedTarget.length) > 2) {
    return false;
  }
  
  // Calcular distância de Levenshtein
  const distance = levenshteinDistance(normalizedLine, normalizedTarget);
  
  return distance <= maxDistance;
}

/**
 * Labels comuns do sistema MV com seus sinônimos
 */
export const MV_LABELS = {
  // Campos de paciente
  NOME: { label: "Nome", synonyms: ["Nome Completo", "Nome de Registro"] },
  CPF: { label: "CPF", synonyms: [] },
  RG: { label: "RG", synonyms: ["Registro Geral"] },
  DATA_NASCIMENTO: { label: "Nascimento", synonyms: ["Data de Nascimento", "Data Nasc", "Dt Nascimento"] },
  SEXO: { label: "Sexo", synonyms: ["Genero", "Gênero"] },
  
  // Campos de endereço
  LOGRADOURO: { label: "Logradouro", synonyms: ["Endereco", "Endereço", "Rua"] },
  NUMERO: { label: "Numero", synonyms: ["Nro", "N", "Número"] },
  COMPLEMENTO: { label: "Complemento", synonyms: ["Compl"] },
  BAIRRO: { label: "Bairro", synonyms: [] },
  CIDADE: { label: "Cidade", synonyms: ["Municipio", "Município"] },
  ESTADO: { label: "Estado", synonyms: ["UF"] },
  CEP: { label: "CEP", synonyms: [] },
  
  // Campos de seguro
  CONVENIO: { label: "Convenio", synonyms: ["Convênio", "Operadora", "Plano de Saude"] },
  PLANO: { label: "Plano", synonyms: [] },
  SUBPLANO: { label: "Subplano", synonyms: ["Sub Plano", "Sub-Plano"] },
  NUMERO_CARTEIRA: { label: "Numero da carteira", synonyms: ["Numero Carteira", "Carteira", "N Carteira", "Nro Carteira", "Número da carteira"] },
  CNS: { label: "CNS", synonyms: ["Cartao Nacional de Saude", "Cartão Nacional de Saúde"] },
  
  // Campos de família
  MAE: { label: "Mae", synonyms: ["Mãe", "Nome da Mae", "Nome da Mãe"] },
  PAI: { label: "Pai", synonyms: ["Nome do Pai"] },
  
  // Outros
  TELEFONE: { label: "Telefone", synonyms: ["Fone", "Tel", "Contato"] },
  EMAIL: { label: "Email", synonyms: ["E-mail", "E mail"] },
} as const;

/**
 * Verifica se uma linha corresponde a um label MV predefinido
 */
export function matchMVLabel(
  line: string,
  labelKey: keyof typeof MV_LABELS,
  options: { maxDistance?: number; exactOnly?: boolean } = {}
): boolean {
  const labelConfig = MV_LABELS[labelKey];
  return matchLabel(line, labelConfig.label, {
    synonyms: [...labelConfig.synonyms],
    ...options,
  });
}
