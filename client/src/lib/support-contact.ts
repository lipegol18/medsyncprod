/**
 * Biblioteca centralizada para contato de suporte via WhatsApp
 * Gerencia números de telefone de suporte de forma unificada
 */

import { useQuery } from "@tanstack/react-query";
import { openWhatsAppChat } from "./whatsapp";

// Tipos para configuração de suporte
export interface SupportContactConfig {
  default: string;
  contexts?: {
    br?: string;
    pt?: string;
    sales?: string;
    [key: string]: string | undefined;
  };
}

// Chave para cache do React Query
const SUPPORT_CONFIG_QUERY_KEY = ['support-config'];

// Fallback em caso de erro ou offline
const FALLBACK_SUPPORT_NUMBER = "5521999991905";

/**
 * Hook para buscar configuração de suporte do backend
 * Usa React Query para cache e gerenciamento de estado
 */
export const useSupportConfig = () => {
  const query = useQuery({
    queryKey: SUPPORT_CONFIG_QUERY_KEY,
    queryFn: async (): Promise<SupportContactConfig> => {
      try {
        const response = await fetch('/api/config/support');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        
        // Salvar backup no localStorage quando busca for bem-sucedida
        try {
          localStorage.setItem('support-config-backup', JSON.stringify(data));
        } catch {
          // Ignorar erro de localStorage
        }
        
        return data;
      } catch (error) {
        console.warn('Erro ao buscar configuração de suporte, usando fallback:', error);
        
        // Tentar buscar do localStorage como backup
        const cached = localStorage.getItem('support-config-backup');
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {
            // Ignorar erro de parse do localStorage
          }
        }
        
        // Fallback final
        return {
          default: FALLBACK_SUPPORT_NUMBER,
          contexts: {
            br: FALLBACK_SUPPORT_NUMBER,
            pt: FALLBACK_SUPPORT_NUMBER,
            sales: FALLBACK_SUPPORT_NUMBER
          }
        };
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutos
    gcTime: 1000 * 60 * 60, // 1 hora
    retry: 3
  });
  
  return query;
};

/**
 * Função para obter número de suporte baseado no contexto
 * @param context - Contexto específico (ex: 'br', 'pt', 'sales')
 * @param config - Configuração de suporte (opcional, será buscada se não fornecida)
 * @returns string - Número de telefone de suporte
 */
export const getSupportNumber = (
  context?: string, 
  config?: SupportContactConfig
): string => {
  // Se config não foi fornecida, usar fallback
  if (!config) {
    return FALLBACK_SUPPORT_NUMBER;
  }
  
  // Se contexto específico foi solicitado e existe
  if (context && config.contexts?.[context]) {
    return config.contexts[context]!;
  }
  
  // Retornar número padrão
  return config.default || FALLBACK_SUPPORT_NUMBER;
};

/**
 * Função para abrir WhatsApp de suporte
 * @param message - Mensagem opcional para pré-preencher
 * @param context - Contexto específico (ex: 'br', 'pt', 'sales')
 * @param config - Configuração de suporte (opcional)
 * @returns boolean - true se conseguiu abrir, false caso contrário
 */
export const openSupportWhatsApp = (
  message?: string,
  context?: string,
  config?: SupportContactConfig
): boolean => {
  const supportNumber = getSupportNumber(context, config);
  return openWhatsAppChat(supportNumber, message);
};

/**
 * Hook customizado que combina busca de config + função de abertura
 * Uso recomendado em componentes React
 */
export const useSupportContact = () => {
  const { data: config, isLoading, error } = useSupportConfig();
  
  const openSupport = (message?: string, context?: string) => {
    return openSupportWhatsApp(message, context, config);
  };
  
  const getNumber = (context?: string) => {
    return getSupportNumber(context, config);
  };
  
  return {
    config,
    isLoading,
    error,
    openSupport,
    getNumber,
    isReady: !isLoading && !error
  };
};

// Função standalone para uso em casos onde hooks não podem ser usados hhjjj
export const openSupportWhatsAppStandalone = async (
  message?: string,
  context?: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/config/support');
    const config: SupportContactConfig = response.ok 
      ? await response.json() 
      : { default: FALLBACK_SUPPORT_NUMBER };
      
    return openSupportWhatsApp(message, context, config);
  } catch (error) {
    console.warn('Erro ao buscar config, usando fallback:', error);
    return openSupportWhatsApp(message, context, { default: FALLBACK_SUPPORT_NUMBER });
  }
};
