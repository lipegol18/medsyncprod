/**
 * Utilitários compartilhados entre extratores CNH (Clássica e Moderna)
 * Contém validações, formatações e tipos comuns
 */

export interface CNHSpecificData {
  categoria?: string;
  validade?: string;
  primeiraHabilitacao?: string;
  registroCNH?: string;
  espelhoCNH?: string;
  observacoes?: string;
  nacionalidade?: string;
  localNascimento?: string;
}

export class CNHCommon {
  
  /**
   * Valida se um CPF é válido usando dígitos verificadores
   */
  static isValidCPF(cpf: string): boolean {
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
  
  /**
   * Formata CPF para XXX.XXX.XXX-XX
   */
  static formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  /**
   * Formata data para DD/MM/YYYY
   */
  static formatDate(date: string): string {
    return date.replace(/[\-\.]/g, '/');
  }
  
  /**
   * Limpa nome removendo caracteres inválidos
   */
  static cleanName(name: string): string {
    return name
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]/gi, '')
      .trim()
      .toUpperCase();
  }
  
  /**
   * Valida se texto é um nome válido
   */
  static isValidName(text: string): boolean {
    if (!text || text.length < 5 || text.length > 60) return false;
    
    const invalidWords = /CARTEIRA|NACIONAL|HABILITAÇÃO|HABILITACAO|DETRAN|REGISTRO|CATEGORIA|VALIDADE|PERMISSÃO|DIRIGIR|REPÚBLICA|BRASIL|DRIVER|LICENSE|PERMISO|CONDUCCION|MINISTERIO|SECRETARIA|TRANSITO|INFRAESTRUTURA|PROIBIDO|PLASTIFICAR|ASSINATURA|PORTADOR|EMISSOR|OBSERVAÇÕES|FILIAÇÃO|NASCIMENTO|BRASILEIRO|TERRITÓRIO/i;
    if (invalidWords.test(text)) return false;
    
    const words = text.trim().split(/\s+/);
    if (words.length < 2) return false;
    
    return /^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]+$/i.test(text);
  }
  
  /**
   * Extrai padrão de data DD/MM/YYYY de texto
   */
  static extractDatePattern(text: string): string | null {
    const match = text.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
    return match ? this.formatDate(match[1]) : null;
  }
  
  /**
   * Extrai CPF de texto
   */
  static extractCPFFromText(text: string): string | null {
    const patterns = [
      /(\d{3}\.\d{3}\.\d{3}[-.]?\d{2})/,
      /(\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2})/,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const cpf = match[1].replace(/[^\d]/g, '');
        if (cpf.length === 11 && this.isValidCPF(cpf)) {
          return this.formatCPF(cpf);
        }
      }
    }
    return null;
  }
  
  /**
   * Extrai RG de texto (7-10 dígitos)
   */
  static extractRGFromText(text: string): string | null {
    const match = text.match(/(\d{1,3}\.?\d{3}\.?\d{3}[-.]?\d?)/);
    if (match) {
      const rg = match[1].replace(/[^\d]/g, '');
      if (rg.length >= 7 && rg.length <= 10) {
        return match[1];
      }
    }
    return null;
  }
  
  /**
   * Extrai categoria da CNH (A, B, AB, etc.)
   */
  static extractCategoria(text: string): string | null {
    const patterns = [
      /(?:CAT\.?\s*HAB\.?|CATEGORIA)[:\s]*([A-E]{1,2}(?:[\s,\/]*[A-E])*)/i,
      /\b(ACC|PPD)\b/i,
      /\b([A-E]{1,2})\s*$/m,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/[\s,]/g, '').toUpperCase();
      }
    }
    return null;
  }
}
