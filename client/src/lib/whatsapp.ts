/**
 * Utilitário para integração com WhatsApp
 * Centraliza a lógica de formatação de números e abertura do WhatsApp
 */

/**
 * Abre uma conversa do WhatsApp com o número fornecido
 * @param phone - Número de telefone (pode conter formatação)
 * @param message - Mensagem opcional para pré-preencher
 * @param defaultCountryCode - Código do país padrão (default: "55" para Brasil)
 * @returns boolean - true se conseguiu abrir, false se número inválido
 */
export const openWhatsAppChat = (
  phone: string | null | undefined, 
  message?: string, 
  defaultCountryCode: string = "55"
): boolean => {
  // Verificar se o telefone existe
  if (!phone) {
    return false;
  }

  // Tratar número que já vem com + internacional
  let workingPhone = phone;
  if (phone.startsWith('+')) {
    // Número internacional: validar com isValidPhone primeiro
    if (!isValidPhone(phone)) {
      return false;
    }
    
    // Remover + e usar como está
    const internationalNumber = phone.slice(1).replace(/\D/g, '');
    
    // Construir URL diretamente
    let whatsappUrl = `https://wa.me/${internationalNumber}`;
    if (message) {
      whatsappUrl += `?text=${encodeURIComponent(message)}`;
    }
    window.open(whatsappUrl, '_blank');
    return true;
  }

  // Formatar o número removendo caracteres não numéricos
  const formattedPhone = workingPhone.replace(/\D/g, '');
  
  // Verificar se o número está vazio após formatação
  if (!formattedPhone) {
    return false;
  }

  // Validar usando a função isValidPhone
  if (!isValidPhone(formattedPhone)) {
    return false;
  }

  // Determinar se precisa adicionar código do país
  let finalPhone: string;
  
  // Se número já tem código de país (mais de 11 dígitos) ou começa com código conhecido multi-dígito
  if (formattedPhone.length > 11 || 
      formattedPhone.startsWith('55') ||    // Brasil
      formattedPhone.startsWith('351') ||   // Portugal
      formattedPhone.startsWith('33') ||    // França
      formattedPhone.startsWith('44') ||    // Reino Unido
      formattedPhone.startsWith('34') ||    // Espanha
      formattedPhone.startsWith('49')) {    // Alemanha
    finalPhone = formattedPhone;
  } else {
    // Número local: adicionar código do país padrão
    finalPhone = `${defaultCountryCode}${formattedPhone}`;
  }

  // Construir a URL do WhatsApp
  let whatsappUrl = `https://wa.me/${finalPhone}`;
  
  // Adicionar mensagem se fornecida
  if (message) {
    const encodedMessage = encodeURIComponent(message);
    whatsappUrl += `?text=${encodedMessage}`;
  }

  // Abrir o WhatsApp em nova aba
  window.open(whatsappUrl, '_blank');
  
  return true;
};

/**
 * Formata um número de telefone para exibição
 * @param phone - Número de telefone
 * @returns string formatado ou string vazia se inválido
 */
export const formatPhoneForDisplay = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  const numbersOnly = phone.replace(/\D/g, '');
  
  // Formatação para números brasileiros
  if (numbersOnly.length === 11) {
    // (XX) XXXXX-XXXX
    return numbersOnly.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (numbersOnly.length === 10) {
    // (XX) XXXX-XXXX
    return numbersOnly.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone; // Retorna original se não conseguir formatar
};

/**
 * Valida se um número de telefone é válido
 * @param phone - Número de telefone
 * @returns boolean
 */
export const isValidPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  
  // Tratar números internacionais com +
  if (phone.startsWith('+')) {
    const numbersOnly = phone.slice(1).replace(/\D/g, '');
    return numbersOnly.length >= 8 && numbersOnly.length <= 15;
  }
  
  const numbersOnly = phone.replace(/\D/g, '');
  
  // Para números sem código: mínimo 8 dígitos, máximo 15
  return numbersOnly.length >= 8 && numbersOnly.length <= 15;
};