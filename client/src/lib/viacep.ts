/**
 * Integração com API ViaCEP para buscar dados de endereço pelo CEP
 */

export interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

/**
 * Busca informações de endereço pelo CEP usando a API ViaCEP
 * @param cep CEP no formato 00000-000 ou 00000000
 * @returns Promise com dados do endereço ou null se inválido
 */
export async function fetchAddressByCEP(cep: string): Promise<ViaCEPResponse | null> {
  try {
    // Limpar CEP removendo caracteres não numéricos
    const cleanCEP = cep.replace(/\D/g, '');
    
    // Validar se o CEP tem 8 dígitos
    if (cleanCEP.length !== 8) {
      return null;
    }

    // Fazer requisição para ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    
    if (!response.ok) {
      throw new Error(`Erro na API ViaCEP: ${response.status}`);
    }

    const data: ViaCEPResponse = await response.json();
    
    // ViaCEP retorna erro: true quando CEP não existe
    if (data.erro) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
}

/**
 * Aplica máscara ao CEP (00000-000)
 * @param cep CEP sem formatação
 * @returns CEP formatado
 */
export function applyCEPMask(cep: string): string {
  const cleanCEP = cep.replace(/\D/g, '');
  
  if (cleanCEP.length <= 5) {
    return cleanCEP;
  } else {
    return `${cleanCEP.slice(0, 5)}-${cleanCEP.slice(5, 8)}`;
  }
}